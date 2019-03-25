const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;
const orgsapi = require('../api/orgs');


const SELECT_ALL = `SELECT Id,Name,OrganizationType,Account,Active,LastModifiedDate,PreferencesOrdersEnabled
					FROM AllOrganization`;

const QUERY_BATCH_SIZE = 500;

let adminJob;

async function fetch(btOrgId, isSandbox, fetchAll, job) {
	adminJob = job;
	return await queryAndStore(btOrgId, isSandbox, fetchAll, false, false);
}

async function refetchInvalid(btOrgId, isSandbox, job) {
	adminJob = job;
	return await queryAndStore(btOrgId, isSandbox,false, true, false);
}

async function queryAndStore(btOrgId, isSandbox, fetchAll, fetchInvalid) {
	let conn = await sfdc.buildOrgConnection(btOrgId);
	let sql = `select org_id, name, edition, account_id, modified_date, features, '${orgsapi.Status.NotFound}' as status 
			from org where is_sandbox = $1`;
	if (fetchInvalid) {
		sql += ` and status = '${orgsapi.Status.NotFound}'`
	} else if (!fetchAll) {
		sql += ` and account_id is null order by modified_date desc`
	}
	let orgs = await db.query(sql, [isSandbox]);
	let count = orgs.length;
	if (count === 0) {
		logger.info("No orgs found to update");
		// Ping the org anyway, to keep our session alive.
		await conn.query(SELECT_ALL + ' LIMIT 1');
		return;
	}

	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Retrieving org records`, {batch: start, count});
		await fetchBatch(conn, orgs.slice(start, start += QUERY_BATCH_SIZE));
	}
}

async function fetchBatch(conn, orgs) {
	let soql = SELECT_ALL;
	let orgIds = orgs.map(o => o.org_id);

	let orgMap = {};
	for (let i = 0; i < orgs.length; i++) {
		let org = orgs[i];
		orgMap[org.org_id] = org;
	}
	soql += ` WHERE Id IN ('${orgIds.join("','")}')`;
	let query = conn.query(soql)
	.on("record", rec => {
		let org = orgMap[sfdc.normalizeId(rec.Id)];
		org.name = rec.Name;
		org.edition = rec.OrganizationType;
		org.account_id = rec.Account;
		org.modified_date = new Date(rec.LastModifiedDate).toISOString();
		org.status = orgsapi.Status.Installed;
		org.features = extractFeatures(rec);
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
	if (rec.PreferencesOrdersEnabled === true) {
		features.push("Orders");
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
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++}, $${n++}, $${n++})`;
		values.push(rec.org_id, rec.name, rec.edition, rec.modified_date, rec.account_id, rec.features, rec.status);
	}
	sql += ` on conflict (org_id) do update set name = excluded.name, edition = excluded.edition, modified_date = excluded.modified_date, 
            account_id = excluded.account_id, features = excluded.features, status = excluded.status`;
	await db.insert(sql, values);
}

async function mark(isSandbox, job) {
	adminJob = job;

	let sql = `update org set account_id = $1, status = '${orgsapi.Status.NotFound}', modified_date = now() where account_id is null
                and is_sandbox = $2`;
	let res = await db.update(sql, [sfdc.INVALID_ID, isSandbox]);
	if (res.length > 0) {
		adminJob.postDetail(`Marked ${res.length} orgs as having invalid accounts`);
	}
}

/**
 * Updates org details from information in the org's account
 */
async function updateOrgsFromAccounts(job) {
	adminJob = job;

	let sql = `UPDATE org o SET account_id = a.account_id, edition = a.edition FROM account a WHERE o.org_id = a.org_id`;
	let res = await db.update(sql);
	if (res.length > 0) {
		adminJob.postDetail(`Updated ${res.length} orgs with with account instances`);
	}
}

/**
 * Updates sandbox org details from parent production orgs
 */
async function updateChildrenFromParents(job) {
	adminJob = job;

	let sql = ` UPDATE org child SET account_id = parent.account_id, edition = parent.edition FROM org parent WHERE child.parent_org_id = parent.org_id`;
	let res = await db.update(sql);
	if (res.length > 0) {
		adminJob.postDetail(`Updated ${res.length} sandbox orgs with with parent org account info`);
	}
}

exports.fetch = fetch;
exports.refetchInvalid = refetchInvalid;
exports.mark = mark;
exports.updateOrgsFromAccounts = updateOrgsFromAccounts;
exports.updateChildrenFromParents = updateChildrenFromParents;
