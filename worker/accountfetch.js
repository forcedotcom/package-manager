const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const SELECT_ALL = `SELECT Id, sfLma__Subscriber_Org_ID__c, sfLma__Account__c, sfLma__Account__r.Name, sfLma__Account__r.LastModifiedDate 
					FROM sfLma__License__c WHERE sfLma__Account__c != NULL`;
let adminJob;

async function fetch(lmaOrgId, fetchAll, job) {
	adminJob = job;
	let fromDate = null;
	if (!fetchAll) {
		let latest = await db.query(`select max(modified_date) max from account`);
		if (latest.length > 0) {
			fromDate = latest[0].max;
		}
	}
	let recs = await query(lmaOrgId, fromDate);
	return upsert(recs, 2000);
}

async function query(lmaOrgId, fromDate) {
	let conn = await sfdc.buildOrgConnection(lmaOrgId);
	let soql = SELECT_ALL;
	if (fromDate) {
		soql += ` AND sfLma__Account__r.LastModifiedDate > ${fromDate.toISOString()}`;
	}
	let res = await conn.query(soql);
	return await load(res, conn);
}

async function fetchMore(nextRecordsUrl, conn, recs) {
	let result = await conn.requestGet(nextRecordsUrl);
	return recs.concat(await load(result, conn));
}

async function load(result, conn) {
	let recs = result.records.map(a => {
		return {
			org_id: a.sfLma__Subscriber_Org_ID__c,
			account_id: a.sfLma__Account__c,
			account_name: a.sfLma__Account__r.Name,
			modified_date: a.sfLma__Account__r.LastModifiedDate
		};
	});
	if (!result.done && !adminJob.canceled) {
		return fetchMore(result.nextRecordsUrl, conn, recs);
	}
	return recs;
}

async function upsert(recs, batchSize) {
	let count = recs.length;
	if (count === 0) {
		logger.info("No new accounts found in LMA");
		adminJob.postDetail(`No new accounts found in LMA`);
		return; // nothing to see here
	}

	adminJob.postDetail(`Storing ${count} account records from LMA`);
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Batch upserting account records`, {batch: Math.min(start + batchSize, count), count: count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = `INSERT INTO account (org_id, account_id, account_name, modified_date) VALUES`;
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.org_id, rec.account_id, rec.account_name, rec.modified_date);
	}
	sql += ` on conflict (account_id) do update set org_id = excluded.org_id, account_name = excluded.account_name, modified_date = excluded.modified_date`;
	await db.insert(sql, values);
}

exports.fetch = fetch;
