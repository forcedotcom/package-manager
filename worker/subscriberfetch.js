const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const SELECT_ALL = `SELECT OrgName,OrgType,InstalledStatus,InstanceName,OrgStatus,MetadataPackageVersionId,OrgKey
					FROM PackageSubscriber`; //LastModifiedDate,ParentOrg

let adminJob;

async function fetch(fetchAll = true, job) {
	let packageOrgs = await db.query(`SELECT org_id, type FROM package_org WHERE type = 'Subscribers'`);
	for (let i = 0; i < packageOrgs.length; i++) {
		await fetchFromOrg("00DA0000000K7g8MAC", fetchAll, job);
	}
}

async function fetchFromOrg(orgId, fetchAll = true, job) {
	adminJob = job;
	let fromDate = null;
	if (!fetchAll) {
		let latest = await db.query(`select max(modified_date) max from org`);
		if (latest.length > 0) {
			fromDate = latest[0].max;
		}
	}
	let recs = await query(orgId, fromDate);
	await upsert(recs, 2000);
}

async function query(orgId, fromDate) {
	let conn = await sfdc.buildOrgConnection(orgId);
	let soql = SELECT_ALL;
	if (fromDate) {
		soql += ` WHERE LastModifiedDate > ${fromDate.toISOString()}`;
	}
	let res = await conn.query(soql);
	return await load(res, conn);
}

async function fetchMore(nextRecordsUrl, conn, recs) {
	let result = await conn.requestGet(nextRecordsUrl);
	return recs.concat(await load(result, conn));
}

async function load(result, conn) {
	let recs = result.records.map(v => {
		return {
			org_id: v.OrgKey,
			name: v.OrgName,
			instance: v.InstanceName,
			is_sandbox: v.OrgType === "Sandbox",
			type: v.OrgType,
			status: v.InstalledStatus === "i" ? "Installed" : "Not Installed",
			modified_date: new Date().toISOString() // v.LastModifiedDate
		};
	});
	if (!result.done && !adminJob.canceled) {
		return await fetchMore(result.nextRecordsUrl, conn, recs);
	}
	return recs;
}

async function upsert(recs, batchSize) {
	let count = recs.length;
	if (count === 0) {
		logger.info("No new orgs found");
		return; // nothing to see here
	}
	logger.info(`New orgs found`, {count});
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Batch upserting org records`, {batch: Math.min(start + batchSize, count), count: count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = "INSERT INTO org (org_id, name, instance, is_sandbox, type, status, modified_date, account_id) VALUES";
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++}, null)`;
		values.push(rec.org_id, rec.name, rec.instance, rec.is_sandbox, rec.type, rec.status, rec.modified_date);
	}
	sql += ` on conflict (org_id) do update set name = excluded.name, type = excluded.type, status = excluded.status`; // Need to include modified date when available
	await db.insert(sql, values);
}

exports.fetch = fetch;