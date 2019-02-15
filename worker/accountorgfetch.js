const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;
const orgsapi = require('../api/orgs');

const SELECT_ALL = `SELECT Id,Name,OrganizationType,Account,Active,LastModifiedDate,PermissionsCpq,PermissionsCpqProvisioned FROM AllOrganization`;

const QUERY_BATCH_SIZE = 500;

let adminJob;

async function fetch(btOrgId, fetchAll, job) {
	adminJob = job || {canceled: false};
	return await queryAndStore(btOrgId, fetchAll, false, false);
}

async function refetchInvalid(btOrgId, job) {
	adminJob = job || {canceled: false};
	return await queryAndStore(btOrgId, false, true, false);
}

async function queryAndStore(btOrgId, fetchAll, fetchInvalid) {
	let conn = await sfdc.buildOrgConnection(btOrgId);
	let sql = `SELECT account_id, org_id, modified_date FROM account
			   WHERE org_id is not null`;
	if (fetchInvalid) {
		sql += ` AND status = '${orgsapi.Status.NotFound}'`
	}
	let accounts = await db.query(sql);
	let count = accounts.length;
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Retrieving org records`, {batch: start, count});
		await fetchBatch(conn, accounts.slice(start, start += QUERY_BATCH_SIZE));
	}
}

async function fetchBatch(conn, accounts) {
	let soql = SELECT_ALL;
	let accountIds = accounts.map(o => o.account_id);
	soql += ` WHERE Account IN ('${accountIds.join("','")}')`;
	let orgs = [];
	let query = conn.query(soql)
		.on("record", rec => {
		orgs.push({
			org_id: sfdc.normalizeId(rec.Id),
			name: rec.Name,
			edition: rec.OrganizationType,
			account_id: rec.Account,
			modified_date: new Date(rec.LastModifiedDate).toISOString(),
			features: extractFeatures(rec)
			});
	})
	.on("end", async () => {
		await upsert(orgs, 2000);
	})
	.on("error", error => {
		adminJob.postDetail("Failed to retrieve orgs", error);
	});

	await query.run({autoFetch: true, maxFetch: 100000});
}

function extractFeatures(rec) {
	let features = [];
	if (rec.PermissionsCpq === true || rec.PermissionsCpqProvisioned === true) {
		features.push("CPQ");
	}
	return features.join(",");
}

async function upsert(recs, batchSize) {
	let count = recs.length;
	if (count === 0) {
		logger.info("No new orgs found in batch");
		return; // nothing to see here
	}
	logger.info(`Upserting orgs found in batch`, {count});
	for (let start = 0; start < count;) {
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = "INSERT INTO org (org_id, name, edition, modified_date, account_id, features, status) VALUES";
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++}, $${n++}, ${orgsapi.Status.Purchased})`;
		values.push(rec.org_id, rec.name, rec.edition, rec.modified_date, rec.account_id, rec.features);
	}
	sql += ` on conflict (org_id) do update set name = excluded.name, edition = excluded.edition, modified_date = excluded.modified_date, 
				features = excluded.features`;
	await db.insert(sql, values);
}

exports.fetch = fetch;
exports.refetchInvalid = refetchInvalid;
