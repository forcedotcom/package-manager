const db = require('../util/pghelper');
const filters = require('./filters');
const push = require('../worker/packagepush');
const logger = require('../util/logger').logger;
const sfdc = require('../api/sfdcconn');
const packageorgs = require('../api/packageorgs');
const admin = require('../api/admin');
const orgpackageversions = require('../api/orgpackageversions');

const Status = {
	NotFound: 'Not Found', 
	Installed: 'Installed', 
	NotInstalled: 'Not Installed'
};

const QUERY_DICTIONARY = new Map([
	["id", "o.id"],
	["org_id", "o.org_id"],
	["name", "o.name"],
	["status", "o.status"],
	["edition", "o.edition"],
	["instance", "o.instance"],
	["type", "o.type"],
	["account_id", "o.account_id"],
	["features", "o.features"],
	["account_name", "a.account_name"],
	["groups", "g.name"],
	["version_number", "pv.version_number"],
	["version_sort", "pv.version_sort"],
	["license_status", "opv.license_status"]
]);

const SELECT_ALL = `
    SELECT o.id, o.org_id, o.name, o.status, o.type, o.edition, o.instance, o.account_id, o.features, 
    a.account_name,
    STRING_AGG(g.name, ', ') as groups
    FROM org o
    INNER JOIN account a on a.account_id = o.account_id
    LEFT JOIN org_group_member AS m ON o.org_id = m.org_id
    LEFT JOIN org_group AS g ON g.id = m.org_group_id`;

const GROUP_BY = `
    GROUP BY o.id, o.org_id, o.name, o.status, o.type, o.instance, o.is_sandbox, o.account_id, 
    a.account_name`;

const SELECT_WITH_LICENCE = ` 
    SELECT o.id, o.org_id, o.name, o.status, o.type, o.edition, o.instance, o.account_id, o.features,
    a.account_name,
    STRING_AGG(g.name, ', ') as groups,
    pv.version_number, pv.version_sort,
    opv.license_status
    FROM org o
    INNER JOIN account a on a.account_id = o.account_id
    LEFT JOIN org_group_member AS m ON o.org_id = m.org_id
    LEFT JOIN org_group AS g ON g.id = m.org_group_id
    INNER JOIN org_package_version opv ON o.org_id = opv.org_id
    INNER JOIN package_version pv ON opv.version_id = pv.version_id`;

const GROUP_BY_WITH_LICENSE = `${GROUP_BY}, pv.version_number, pv.version_sort, opv.license_status`;

async function requestAll(req, res, next) {
	try {
		let orgs = await findAll(req.query.packageId, req.query.versionId, req.query.sort_field, req.query.sort_dir, 
			req.query.filterColumns ? JSON.parse(req.query.filterColumns) : null, req.query.page, req.query.pageSize);
		return res.send(JSON.stringify(orgs));
	} catch (err) {
		next(err);
	}
}

async function findAll(packageId, versionId, orderByField, orderByDir, filterColumns) {
	let select = SELECT_ALL;
	let groupBy = GROUP_BY;
	let whereParts = [`o.status != '${Status.NotFound}'`];
	let values = [];

	if (packageId || versionId) {
		select = SELECT_WITH_LICENCE;
		groupBy = GROUP_BY_WITH_LICENSE;

		if (packageId) {
			values.push(packageId);
			whereParts.push("opv.package_id = $" + values.length);
			whereParts.push(`o.status != '${Status.NotInstalled}'`)
		}

		if (versionId) {
			values.push(versionId);
			whereParts.push("opv.version_id = $" + values.length);
			whereParts.push(`o.status != '${Status.NotInstalled}'`)
		}
	}

	if (filterColumns && filterColumns.length > 0) {
		whereParts.push(...filters.parseSQLExpressions(QUERY_DICTIONARY, filterColumns));
	} 
	
	let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
	let sort = `ORDER BY ${orderByField || "id"} ${orderByDir || "desc"}`;

	try { 
		return await db.query(`${select} ${where} ${groupBy} ${sort}`, values);
	} catch (e) {
		// Try without sorting
		return await db.query(`${select} ${where} ${groupBy}`, values);
	}
}

function requestById(req, res, next) {
	let id = req.params.id;
	let where = " WHERE o.org_id = $1";
	db.query(SELECT_ALL + where + GROUP_BY, [id])
		.then(function (org) {
			return res.json(org[0]);
		})
		.catch(next);
}

function requestUpgrade(req, res, next) {
	push.upgradeOrgs([req.params.id], req.body.versions, req.body.scheduled_date, req.session.username, req.body.description)
		.then((result) => {
			return res.json(result)
		})
		.catch(e => {
			logger.error("Failed to upgrade org", {org_id: req.params.id, error: e.message || e});
			next(e);
		});
}

async function requestAdd(req, res, next) {
	try {
		await addOrgsByIds(req.body.orgIds);
		admin.emit(admin.Events.ORGS);
	} catch (e) {
		logger.error("Failed to fetch subscriber orgs", {org_ids: req.body.orgIds, error: e.message || e});
		next(e);
	}
}

async function addOrgsByIds(orgIds) {
	let packageOrgs = await db.query(`SELECT org_id FROM package_org WHERE status = $1 AND namespace is not null`, [packageorgs.Status.Connected]);
	let packageOrgIds = packageOrgs.map(o => o.org_id);
	let recs = await push.findSubscribersByIds(packageOrgIds, orgIds);
	let uniqueSet = new Set();
	let uniqueRecs = recs.filter(rec => {
		if (uniqueSet.has(rec.OrgKey))
			return false;
		uniqueSet.add(rec.OrgKey);
		return true;
	});

	if (uniqueRecs.length === 0) {
		logger.info("Did not find any subscribers for given org ids", {org_ids: orgIds.join(", ")});
		return;
	}

	await insertOrgsFromSubscribers(uniqueRecs);

	const opvs = recs.map(rec => {
		return {
			org_id: rec.OrgKey.substring(0, 15),
			version_id: rec.MetadataPackageVersionId,
			license_status: orgpackageversions.LicenseStatus.Active
		}
	});
	await orgpackageversions.insertOrgPackageVersions(opvs);
}

async function insertOrgsFromSubscribers(recs) {
	let params = [], values = [];
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		params.push(`($${n++},$${n++},$${n++},$${n++},$${n++},$${n++},NOW())`);
		values.push(rec.OrgKey.substring(0, 15), rec.OrgName, rec.OrgType, rec.InstanceName, sfdc.INTERNAL_ID, Status.Installed);
	}

	let sql = `INSERT INTO org (org_id, name, edition, instance, account_id, status, modified_date) 
                       VALUES ${params.join(",")}
                       on conflict (org_id) do update set status = '${Status.Installed}', 
                       account_id = excluded.account_id where org.status = '${Status.NotFound}'`;
	return db.insert(sql, values);
}

async function findByGroup(orgGroupId) {
	let where = "WHERE o.org_id IN (SELECT org_id FROM org_group_member WHERE org_group_id = $1)";
	return await db.query(`${SELECT_ALL} ${where} ${GROUP_BY}`, [orgGroupId])
}

async function findByIds(orgIds) {
	let n = 1;
	let params = orgIds.map(() => `$${n++}`);
	let where = `WHERE org_id IN (${params.join(",")})`;
	return await db.query(SELECT_ALL + where + GROUP_BY, orgIds)
}


exports.Status = Status;
exports.requestAll = requestAll;
exports.requestAdd = requestAdd;
exports.requestById = requestById;
exports.requestUpgrade = requestUpgrade;
exports.findByGroup = findByGroup;
exports.findByIds = findByIds;
exports.addOrgsByIds = addOrgsByIds;