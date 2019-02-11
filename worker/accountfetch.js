const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const QUERY_BATCH_SIZE = 500;

const SELECT_ALL = `SELECT Id, Name, OrgId, Instance__c, Core_Edition__c, LastModifiedDate FROM Account`;

let adminJob;

async function fetch(org62Id, fetchAll, job) {
	adminJob = job;

	return await queryAndStore(org62Id, fetchAll, QUERY_BATCH_SIZE, false);
}

async function queryAndStore(org62Id, fetchAll, batchSize, useBulkAPI) {
	let sql = `SELECT account_id, modified_date FROM account WHERE account_id NOT IN($1, $2)`;
	if (!fetchAll) {
		sql += ` AND account_name IS NULL ORDER BY modified_date desc`
	}
	let accounts = await db.query(sql, [sfdc.INVALID_ID, sfdc.INTERNAL_ID]);
	let count = accounts.length;
	if (count === 0) {
		logger.info("No accounts found to update");
		return;
	}

	let conn = await sfdc.buildOrgConnection(org62Id);
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Querying accounts`, {start, count});
		await fetchBatch(conn, accounts.slice(start, start += batchSize), useBulkAPI);
	}
}

async function fetchBatch(conn, accounts, useBulkAPI) {
	let soql = SELECT_ALL;
	let accountIds = accounts.map(r => r.account_id);

	let accountMap = {};
	for (let i = 0; i < accounts.length; i++) {
		let account = accounts[i];
		accountMap[account.account_id] = account;
	}
	soql += ` WHERE Id IN ('${accountIds.join("','")}')`;
	let count = 0;
	let query = (useBulkAPI ? conn.bulk.query(soql) : conn.query(soql))
	.on("record", rec => {
		count++;
		let account = accountMap[sfdc.normalizeId(rec.Id)];
		account.account_name = rec.Name;
		account.org_id = rec.OrgId ? sfdc.normalizeId(rec.OrgId) : null;
		account.instance = sfdc.normalizeInstanceName(rec.Instance__c);
		account.edition = rec.Core_Edition__c;
		account.modified_date = new Date(rec.LastModifiedDate).toISOString();
	})
	.on("end", async () => {
		logger.info(`Found accounts`, {count});
		await upsert(accounts, 2000);
	})
	.on("error", error => {
		adminJob.postProgress("Failed to query accounts", null, error.message || error);
	});
	if (!useBulkAPI) {
		await query.run({autoFetch: true, maxFetch: 100000});
	}
}

async function upsert(recs, batchSize) {
	let count = recs.length;
	if (count === 0) {
		logger.info("No new account records found");
		return; // nothing to see here
	}
	logger.info(`New account records found`, {count});
	for (let start = 0; start < count && !adminJob.canceled;) {
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = "INSERT INTO account (org_id, instance, edition, account_id, account_name, modified_date) VALUES";
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.org_id, rec.instance, rec.edition, rec.account_id, rec.account_name, rec.modified_date);
	}
	sql += ` on conflict (account_id) do update set account_name = excluded.account_name, org_id = excluded.org_id, 
				instance = excluded.instance, edition = excluded.edition, modified_date = excluded.modified_date`;
	await db.insert(sql, values);
}

async function mark() {
	let sql = `update account set status = 'Not Found' where account_name is null`;
	let res = await db.update(sql);
	if (res.length > 0) {
		logger.info(`Marked records as invalid accounts`, {count: res.length});
	}
}

exports.fetch = fetch;
exports.mark = mark;
