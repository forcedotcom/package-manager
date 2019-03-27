const sfdc = require('../../api/sfdcconn');
const db = require('../../util/pghelper');
const logger = require('../../util/logger').logger;

const SELECT_ALL = `SELECT Apttus_Config2__AccountId__c, Apttus_Config2__AccountId__r.Name,
						Apttus_Config2__AccountId__r.Organization_ID_DW__c, Apttus_Config2__AccountId__r.LastModifiedDate 
					FROM Apttus_Config2__AssetLineItem__c 
					WHERE Name LIKE '%CPQ%' AND Apttus_Config2__StartDate__c <= TODAY AND Apttus_Config2__EndDate__c >= TODAY
					AND apttus_config2__isinactive__c = false`;

let adminJob;

async function fetch(org62Id, fetchAll, job) {
	adminJob = job || {canceled: false};
	let fromDate = null;
	if (!fetchAll) {
		let latest = await db.query(`select max(modified_date) max from account`);
		if (latest.length > 0) {
			fromDate = latest[0].max;
		}
	}
	let recs = await query(org62Id, fromDate);
	return upsert(recs, 2000);
}

async function query(org62Id, fromDate) {
	let conn = await sfdc.buildOrgConnection(org62Id);
	let soql = SELECT_ALL;
	if (fromDate) {
		soql += ` AND Apttus_Config2__AccountId__r.LastModifiedDate > ${fromDate.toISOString()}`;
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
			org_id: v.Apttus_Config2__AccountId__r.Organization_ID_DW__c,
			account_id: sfdc.normalizeId(v.Apttus_Config2__AccountId__c),
			account_name: v.Apttus_Config2__AccountId__r.Name,
			modified_date: v.Apttus_Config2__AccountId__r.LastModifiedDate,
			status: 'Purchased'
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
		logger.info("No new account records found");
		return; // nothing to see here
	}

	let accountMap = new Map();
	for (let i = 0; i < recs.length; i++) {
		const rec = recs[i];
		accountMap.set(rec.account_id, rec);
	}
	recs = Array.from(accountMap.values());
	count = recs.length;

	logger.info(`New account records found`, {count});
	for (let start = 0; start < count && !adminJob.canceled;) {
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = "INSERT INTO account (org_id, account_id, account_name, modified_date, status) VALUES";
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.org_id, rec.account_id, rec.account_name, rec.modified_date, rec.status);
	}
	sql += ` on conflict (account_id) do update set account_name = excluded.account_name, org_id = excluded.org_id, 
                modified_date = excluded.modified_date, status = excluded.status`;
	await db.insert(sql, values);
}

exports.fetch = fetch;