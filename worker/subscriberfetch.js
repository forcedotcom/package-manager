const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;
const opvapi = require('../api/orgpackageversions');
const orgs = require('../api/orgs');

const SELECT_ALL =
	`SELECT OrgName,OrgType,InstalledStatus,InstanceName,OrgStatus,MetadataPackageVersionId,OrgKey,ParentOrg,SystemModstamp
		FROM PackageSubscriber`;

const SELECT_ALL_WITHOUT_MODSTAMP =
	`SELECT OrgName,OrgType,InstalledStatus,InstanceName,OrgStatus,MetadataPackageVersionId,OrgKey,ParentOrg
		FROM PackageSubscriber`;

let adminJob;

async function fetch(fetchAll, job) {
	adminJob = job;
	const SELECT_PACKAGE_ORGS =
		`SELECT o.org_id, o.name, o.type, p.sfid package_id
		FROM package_org o
		INNER JOIN package p on p.package_org_id = o.org_id
		WHERE o.active = true AND type = '${sfdc.OrgTypes.Package}'`;

	if (fetchAll) {
		// Invalidate all existing orgs when we are upserting all new findings
		// (Not when orgIds is given)
		await db.update(`UPDATE org set status = $1`, [orgs.Status.NotFound]);
	}

	const packageOrgs = await db.query(SELECT_PACKAGE_ORGS);
	for (let i = 0; i < packageOrgs.length; i++) {
		await fetchFromOrg(packageOrgs[i], fetchAll);
	}
}

async function fetchByOrgGroupId(groupId, job) {
	adminJob = job;
	const SELECT_PACKAGE_ORGS =
		`SELECT o.org_id, o.name, o.type, p.sfid package_id
		FROM package_org o
		INNER JOIN package p on p.package_org_id = o.org_id
		WHERE o.active = true AND type = '${sfdc.OrgTypes.Package}'`;

	const packageOrgs = await db.query(SELECT_PACKAGE_ORGS);
	for (let i = 0; i < packageOrgs.length; i++) {
		const packageOrg = packageOrgs[i];
		const SELECT_GROUP_MEMBERS_BY_PACKAGE_ORG = `
			SELECT opv.org_id FROM org_package_version opv
			INNER JOIN org_group_member m on m.org_id = opv.org_id		
			INNER JOIN package p on p.sfid = opv.package_id	
			WHERE m.org_group_id = $1 AND p.package_org_id = $2`;
		const orgIds = await db.query(SELECT_GROUP_MEMBERS_BY_PACKAGE_ORG, [groupId, packageOrg.org_id]);
		await fetchFromOrgByOrgIds(packageOrg, orgIds.map(o => o.org_id));
	}
}

async function fetchByOrgIds(orgIds, job) {
	adminJob = job;
	const SELECT_PACKAGE_ORGS =
		`SELECT o.org_id, o.name, o.type, p.sfid package_id
		FROM package_org o
		INNER JOIN package p on p.package_org_id = o.org_id
		WHERE o.active = true AND type = '${sfdc.OrgTypes.Package}'`;

	const packageOrgs = await db.query(SELECT_PACKAGE_ORGS);
	for (let i = 0; i < packageOrgs.length; i++) {
		await fetchFromOrgByOrgIds(packageOrgs[i], orgIds);
	}
}

async function fetchFromOrg(org, fetchAll) {
	let invalidateAll = false;
	let whereParts = [];
	if (!fetchAll) {
		let latest = await db.query(
			`SELECT MAX(modified_date) FROM org_package_version WHERE package_id = $1`, [org.package_id]);
		if (latest[0].max) {
			whereParts.push(`SystemModstamp > ${latest[0].max.toISOString()}`);
		}
	}

	adminJob.postMessage(`Querying orgs from ${org.name}`);

	const where = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
	let res;
	let conn = await sfdc.buildOrgConnection(org.org_id);
	try {
		res = await conn.queryWithRetry(`${SELECT_ALL} ${where}`);
		adminJob.postDetail(`Found ${res.totalSize} orgs ${fetchAll ? '' : 'using last modified date'}`);
		invalidateAll = fetchAll;
	} catch (e) {
		if (e.errorCode === 'QUERY_TIMEOUT') {
			return fail(org, e);
		}

		// TODO remove after 220 GA when modstamp is available for all
		logger.warn("Could not query with modstamp", e);
		try {
			const where = orgIds ? `WHERE OrgKey IN ('${orgIds.join("','")}')` : "";
			res = await conn.queryWithRetry(`${SELECT_ALL_WITHOUT_MODSTAMP} ${where}`);
			adminJob.postDetail(`Found ${res.totalSize} orgs`);
			invalidateAll = true; // Not using modstamp, so always invalidate
		} catch (e) {
			return fail(org, e);
		}
	}

	let recs = await load(res, conn);

	if (recs.length === 0)
		return;

	if (invalidateAll) {
		// Invalidate all existing org package versions when we are upserting all new findings
		await opvapi.updateStatus(org.package_id, opvapi.LicenseStatus.NotFound);
	}

	adminJob.postDetail(`Storing ${recs.length} orgs`);
	await upsert(recs, 2000);
}

async function fetchFromOrgByOrgIds(org, orgIds, batchSize = 500) {
	adminJob.postMessage(`Querying orgs from ${org.name}`);
	let conn = await sfdc.buildOrgConnection(org.org_id);
	let recs = [];
	const count = orgIds.length;
	try {
		for (let start = 0; start < count && !adminJob.canceled;) {
			const idBatch = orgIds.slice(start, start += batchSize);
			const where = `WHERE OrgKey IN ('${idBatch.join("','")}')`;
			let res = await conn.queryWithRetry(`${SELECT_ALL_WITHOUT_MODSTAMP} ${where}`);

			// If we are querying orgs by id, we have to null out the modified date to make sure we do not screw up
			// our normal fetch-by-date logic.
			const storeModifiedDate = false;
			recs = recs.concat(await load(res, conn, storeModifiedDate, new Set(idBatch)));
		}

		adminJob.postDetail(`Found ${recs.length} orgs`);
	} catch (e) {
		return fail(org, e);
	}

	if (recs.length === 0)
		return;

	adminJob.postDetail(`Storing ${recs.length} orgs`);
	await upsert(recs, 2000);
}

function fail(org, e) {
	adminJob.postDetail(`Failed to retrieve orgs from ${org.name}`, e);
}

async function load(result, conn, storeModifiedDate = true, idSet) {
	let recs = [];
	result.records.forEach(v => {
	    if (idSet && !idSet.has(v.OrgKey)) {
	        // see W-6129024.  Once fixed, get rid of this idSet check.
            return;
        }

        recs.push({
            org_id: v.OrgKey,
            name: v.OrgName,
            parent_org_id: v.ParentOrg,
            instance: v.InstanceName,
            is_sandbox: v.OrgType === "Sandbox",
            type: v.OrgType,
            status: orgs.Status.Installed,
            package_version_id: v.MetadataPackageVersionId,
            modified_date: storeModifiedDate ? v.SystemModstamp : null
        });
	});
	if (!result.done && !adminJob.canceled) {
		let nextResult = await conn.requestGet(result.nextRecordsUrl);
		recs = recs.concat(await load(nextResult, conn, storeModifiedDate, idSet));
	}
	return recs;
}

async function upsert(recs, batchSize) {
	let count = recs.length;
	if (count === 0) {
		return; // nothing to see here
	}
	for (let start = 0; start < count && !adminJob.canceled;) {
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = "INSERT INTO org (org_id, name, instance, is_sandbox, type, status, modified_date, parent_org_id) VALUES";
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.org_id, rec.name, rec.instance, rec.is_sandbox, rec.type, rec.status, rec.modified_date, rec.parent_org_id);
	}
	sql += ` on conflict (org_id) do update set name = excluded.name, instance = excluded.instance, type = excluded.type, 
				status = excluded.status, modified_date = excluded.modified_date, parent_org_id = excluded.parent_org_id`;
	await db.insert(sql, values);

	const opvs = recs.map(rec => {
		return {
			org_id: rec.org_id,
			version_id: rec.package_version_id,
			license_status: opvapi.LicenseStatus.Active,
			modified_date: rec.modified_date
		}
	});
	await opvapi.insertOrgPackageVersions(opvs);
}

exports.fetch = fetch;
exports.fetchByOrgIds = fetchByOrgIds;
exports.fetchByOrgGroupId = fetchByOrgGroupId;