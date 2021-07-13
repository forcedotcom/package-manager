const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;
const packageorgs = require("../api/packageorgs");
const org62accounts = require("./org62fetch");

const SELECT_ALL = `SELECT Id, sfLma__Subscriber_Org_ID__c, sfLma__Account__c, sfLma__Account__r.Name, sfLma__Account__r.LastModifiedDate 
					FROM sfLma__License__c WHERE sfLma__Account__c != NULL`;
let adminJob;

async function fetch(fetchAll, job) {
	adminJob = job;

	const orgs = await packageorgs.retrieveByType([sfdc.OrgTypes.Licenses,sfdc.OrgTypes.Accounts]);
	for (let i = 0; i < orgs.length; i++) {
		let org = orgs[i];
		try {
			// Special handling for internal orgs.
			if (org.instance_url === "https://org62.my.salesforce.com") {
				await org62accounts.fetch(org.org_id, fetchAll, job)
			} else {
				await fetchFromOrg(org.org_id, fetchAll);
			}
		} catch (e) {
			if (e.name === "invalid_grant") {
				packageorgs.updateOrgStatus(org.org_id, packageorgs.Status.Invalid)
					.then(() => {});
			}
		}
	}
}

async function fetchFromOrg(lmaOrgId, fetchAll) {
	let fromDate = null;
	if (!fetchAll) {
		let latest = await db.query(`select max(modified_date) max from account WHERE license_org_id = $1`, [lmaOrgId]);
		if (latest.length > 0) {
			fromDate = latest[0].max;
		}
	}
	let recs = await query(lmaOrgId, fromDate);
	await upsert(recs, 2000);
}

async function query(lmaOrgId, fromDate) {
	let conn = await sfdc.buildOrgConnection(lmaOrgId);
	let soql = SELECT_ALL;
	if (fromDate) {
		soql += ` AND sfLma__Account__r.LastModifiedDate > ${fromDate.toISOString()}`;
	}
	let res = await conn.query(soql);
	return await load(res, conn, lmaOrgId);
}

async function fetchMore(nextRecordsUrl, conn, recs, lmaOrgId) {
	let result = await conn.requestGet(nextRecordsUrl);
	return recs.concat(await load(result, conn, lmaOrgId));
}

async function load(result, conn, lmaOrgId) {
	let recs = result.records.map(a => {
		return {
			org_id: a.sfLma__Subscriber_Org_ID__c,
			license_org_id: lmaOrgId,
			account_id: a.sfLma__Account__c,
			account_name: a.sfLma__Account__r.Name,
			modified_date: a.sfLma__Account__r.LastModifiedDate
		};
	});
	if (!result.done && !adminJob.canceled) {
		return fetchMore(result.nextRecordsUrl, conn, recs, lmaOrgId);
	}

	const orgUrl = conn.instanceUrl;
	if (recs.length === 0) {
		logger.info(`No new accounts found in ${orgUrl}`);
		adminJob.postDetail(`No new accounts found in ${orgUrl}`);
	} else {
		adminJob.postDetail(`Loaded ${recs.length} account records from ${orgUrl}`);
	}
	return recs;
}

async function upsert(recs, batchSize) {
	const count = recs.length;
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Batch upserting account records`, {batch: Math.min(start + batchSize, count), count: count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	const values = [], params = [];
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		params.push(`$${n++},$${n++},$${n++},$${n++},$${n++}`);
		values.push(rec.org_id, rec.license_org_id, rec.account_id, rec.account_name, rec.modified_date);
	}
	let sql =
		`INSERT INTO account (org_id, license_org_id, account_id, account_name, modified_date) 
		 VALUES (${params.join("),(")})
	 	 ON CONFLICT (account_id) DO UPDATE SET org_id = excluded.org_id, license_org_id = excluded.license_org_id, 
					account_name = excluded.account_name, modified_date = excluded.modified_date`;
	await db.insert(sql, values);
}

exports.fetch = fetch;
