const db = require('../util/pghelper');
const filters = require('./filters');
const push = require('../worker/packagepush');
const subs = require('../worker/subscriberfetch');
const logger = require('../util/logger').logger;
const sfdc = require('../api/sfdcconn');
const packageorgs = require('../api/packageorgs');
const orggroups = require('../api/orggroups');
const admin = require('../api/admin');
const orgpackageversions = require('../api/orgpackageversions');

const Status = {
	NotFound: 'Not Found', 
	Installed: 'Installed', 
	NotInstalled: 'Not Installed',
	Purchased: 'Purchased'
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
    LEFT JOIN account a on a.account_id = o.account_id
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
    LEFT JOIN account a on a.account_id = o.account_id
    LEFT JOIN org_group_member AS m ON o.org_id = m.org_id
    LEFT JOIN org_group AS g ON g.id = m.org_group_id
    INNER JOIN org_package_version opv ON o.org_id = opv.org_id
    INNER JOIN package_version pv ON opv.version_id = pv.version_id`;

const GROUP_BY_WITH_LICENSE = `${GROUP_BY}, pv.version_number, pv.version_sort, opv.license_status`;

async function requestAll(req, res, next) {
	try {
		let orgs = await findAll(req.query.packageId, req.query.versionId, req.query.relatedOrgId, req.query.blacklistUpgradeId, req.query.sort_field, req.query.sort_dir,
			req.query.filterColumns ? JSON.parse(req.query.filterColumns) : null, req.query.blacklisted);
		return res.send(JSON.stringify(orgs));
	} catch (err) {
		next(err);
	}
}

async function findAll(packageId, versionId, relatedOrgId, blacklistUpgradeId, orderByField, orderByDir, filterColumns, blacklisted) {
	let select = SELECT_ALL;
	let groupBy = GROUP_BY;
	let whereParts = [`o.status != '${Status.NotFound}'`];
	let values = [];

	if (packageId || versionId) {
		select = SELECT_WITH_LICENCE;
		groupBy = GROUP_BY_WITH_LICENSE;

		if (packageId) {
			values.push(packageId);
			whereParts.push(`opv.package_id = $${values.length}`);
		}

		if (versionId) {
			values.push(versionId);
			whereParts.push(`opv.version_id = $${values.length}`);
		}
	}

	if (relatedOrgId) {
		values.push(relatedOrgId);
		whereParts.push(`o.account_id IN (
							SELECT ro.account_id FROM org ro WHERE ro.org_id = $${values.length}
						)`);
	}
	
	if (blacklistUpgradeId) {
		values.push(blacklistUpgradeId);
		whereParts.push(`o.org_id IN (
							SELECT ub.org_id FROM upgrade_blacklist ub WHERE ub.upgrade_id = $${values.length}
						)`);
	}
	
	if (filterColumns && filterColumns.length > 0) {
		whereParts.push(...filters.parseSQLExpressions(QUERY_DICTIONARY, filterColumns));
	} 
	
	if (blacklisted) {
		whereParts.push(orggroups.EXPAND_BLACKLIST ? 
			`o.account_id IN (
				SELECT DISTINCT bo.account_id FROM org bo
				INNER JOIN org_group_member m ON m.org_id = bo.org_id AND bo.account_id != '${sfdc.AccountIDs.Internal}'
				INNER JOIN org_group g ON g.id = m.org_group_id AND g.type = '${orggroups.GroupType.Blacklist}'
			 )` :
			`g.type = '${orggroups.GroupType.Blacklist}'`);
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
		.then(async function (orgs) {
			const org = orgs[0];
			org.blacklisted = await orggroups.isBlacklisted(id);
			return res.json(org);
		})
		.catch(next);
}

function requestUpgrade(req, res, next) {
	push.upgradeOrgs([req.params.id], req.body.versions, req.body.scheduled_date, req.session.username, req.body.description, req.body.transid)
		.then((upgrade) => {
			admin.emit(admin.Events.UPGRADE, upgrade);
		})
		.catch(e => {
			logger.error("Failed to upgrade org", {org_id: req.params.id, error: e.message || e});
			next(e);
		});
	
	return res.json({result: "OK"});
}

async function requestAdd(req, res, next) {
	addOrgsByIds(req.body.orgIds).then(() =>{
		admin.emit(admin.Events.ORGS, req.body.transid);
	}).catch(next);
	
	res.json({result: "OK"});
}

async function addOrgsByIds(orgIds) {
	const job = new admin.AdminJob(
		admin.JobTypes.FETCH, "Fetch subscribers by org id",
		[
			{
				name: "Fetch subscribers",
				handler: job => subs.fetchByOrgIds(orgIds, job)
			}
		]);
	await job.run();
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

async function findByTerm(term, limit = 10) {
	let where = "WHERE o.org_id = $1 OR o.name ILIKE $2 OR o.account_id = $1 OR a.account_name ILIKE $2";
	return await db.query(`${SELECT_ALL} ${where} ${GROUP_BY} ORDER BY o.name LIMIT ${limit}`, [`${term}`, `%${term}%`])
}


exports.Status = Status;
exports.requestAll = requestAll;
exports.requestAdd = requestAdd;
exports.requestById = requestById;
exports.requestUpgrade = requestUpgrade;
exports.findByGroup = findByGroup;
exports.findByIds = findByIds;
exports.findByTerm = findByTerm;
exports.addOrgsByIds = addOrgsByIds;