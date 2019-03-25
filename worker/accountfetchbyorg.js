const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const QUERY_BATCH_SIZE = 500;

const SELECT_ALL = `SELECT Id, Name, Organization_ID_DW__c, Instance__c, Core_Edition__c, LastModifiedDate FROM Account`;

let adminJob;

/**
 * Fetch account id and name based on org id.  Internal? org62.  External? licenses.
 */
async function fetch(accountsOrgId, fetchAll, job) {
	adminJob = job;

	return await queryAndStore(accountsOrgId, fetchAll, QUERY_BATCH_SIZE, false);
}

async function queryAndStore(accountsOrgId, fetchAll, batchSize, useBulkAPI) {
	// Select all prod org ids
	let sql = `SELECT org_id FROM org WHERE is_sandbox = false`;
	if (!fetchAll) {
		// ...but only those that have no account AND whose org id is not already found in our accounts table
		sql = `${sql} 
			AND 
			(account_id IS NULL AND org_id NOT IN 
				(SELECT org_id FROM account WHERE org_id IS NOT NULL))
			OR 
			(account_id IS NOT NULL AND account_id NOT IN 
				(select account_id from account))`;
	}
	// Union it with all sandbox org's parent org ids, for the case where the parent org does not actually have the package
	// installed (and thus we have no org record for it).  We need to get the account even if we don't have the prod org.
	sql = `${sql} UNION
		SELECT parent_org_id as org_id FROM org WHERE parent_org_id IS NOT NULL`;
	if (!fetchAll) {
		// ...again, only those that have no account AND whose org id is not already found in our accounts table
		sql = `${sql} 
			AND 
			(account_id IS NULL AND org_id NOT IN 
				(SELECT org_id FROM account WHERE org_id IS NOT NULL))
			OR 
			(account_id IS NOT NULL AND account_id NOT IN 
				(select account_id from account))`;
	}

	let orgs = await db.query(sql);
	let count = orgs.length;
	if (count === 0) {
		logger.info("No orgs found to update");
		return;
	}

	let conn = await sfdc.buildOrgConnection(accountsOrgId);
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Querying accounts`, {start, count});
		await fetchBatch(conn, orgs.slice(start, start += batchSize), useBulkAPI);
	}
}

async function fetchBatch(conn, orgs, useBulkAPI) {
	let soql = SELECT_ALL;
	let orgIds = orgs.map(r => r.org_id);

	const accounts = [];

	soql += ` WHERE Organization_ID_DW__c IN ('${orgIds.join("','")}')`;
	let count = 0;
	let query = (useBulkAPI ? conn.bulk.query(soql) : conn.query(soql))
	.on("record", rec => {
		count++;
		accounts.push({
			account_id: rec.Id,
			account_name: rec.Name,
			instance: sfdc.normalizeInstanceName(rec.Instance__c),
			edition: rec.Core_Edition__c,
			org_id: rec.Organization_ID_DW__c ? sfdc.normalizeId(rec.Organization_ID_DW__c) : null,
			modified_date: new Date(rec.LastModifiedDate).toISOString()});
	})
	.on("end", async () => {
		if (count > 0) {
			adminJob.postDetail(`Found ${count} account records in batch`);
			await upsert(accounts, 2000);

			// Mark this batch of orgs with the accounts we found.
			let values = accounts.map(a => a.account_id);
			await db.update(`UPDATE org o SET account_id = a.account_id, edition = a.edition 
							FROM account a WHERE o.org_id = a.org_id
							AND a.account_id IN (${accounts.map((o, i) => `$${i + 1}`).join(',')})`, values);
		}

		// Mark any orgs in this batch where account id is still null as internal
		let values = [sfdc.AccountIDs.Internal];
		values.push(...orgIds);
		await db.update(`UPDATE org SET account_id = $1 WHERE account_id IS NULL
			AND org_id IN (${orgIds.map((o, i) => `$${i+2}`).join(',')})`, values);
	})
	.on("error", error => {
		adminJob.postDetail("Failed to query accounts", error);
	});
	if (!useBulkAPI) {
		await query.run({autoFetch: true, maxFetch: 100000});
	}
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
	let sql = "INSERT INTO account (org_id, account_id, account_name, edition, modified_date) VALUES";
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.org_id, rec.account_id, rec.account_name, rec.edition, rec.modified_date);
	}
	sql += ` on conflict (account_id) do update set account_name = excluded.account_name, org_id = excluded.org_id, 
				edition = excluded.edition, modified_date = excluded.modified_date`;
	await db.insert(sql, values);
}

exports.fetch = fetch;
