const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;
const orgsapi = require('../api/orgs');

const SELECT_ALL = `SELECT Id,OrgName,OrgType,InstalledStatus,InstanceName,OrgStatus,MetadataPackageVersionId,OrgKey 
                    FROM PackageSubscriber`;


async function fetch(fetchAll, packageOrgId, batchSize = 100) {
	return await queryAndStore(packageOrgId, fetchAll, false, batchSize, false);
}

async function refetchInvalid(packageOrgId, batchSize = 100) {
	return await queryAndStore(packageOrgId, false, true, batchSize, false);
}

async function queryAndStore(packageOrgId, fetchAll, fetchInvalid, batchSize) {
	packageOrgId = packageOrgId || '00DA0000000K7g8MAC'; // defaults to CPQ org

	let conn = await sfdc.buildOrgConnection(packageOrgId);
	let fromDate = null;
	let sql = `select org_id, modified_date from org`;
	if (fetchInvalid) {
		sql += ` where status = '${orgsapi.Status.NotFound}'`
	} else if (!fetchAll) {
		sql += ` where account_id is null order by modified_date desc`
	}
	let orgs = await db.query(sql);
	let count = orgs.length;
	if (count === 0) {
		logger.info("No orgs found to update");
		// Ping the org anyway, to keep our love (and, session) alive.
		await conn.query(SELECT_ALL + ' LIMIT 1');
		return;
	}

	if (!fetchAll && !fetchInvalid) {
		fromDate = orgs[0].modified_date;
	}

	for (let start = 0; start < count;) {
		logger.info(`Retrieving org records`, {batch: start, count});
		await fetchBatch(conn, orgs.slice(start, start += batchSize), fromDate);
	}
}

async function fetchBatch(conn, orgs, useBulkAPI) {
	let soql = SELECT_ALL;
	let orgIds = orgs.map(o => o.org_id);

	let orgMap = {};
	for (let i = 0; i < orgs.length; i++) {
		let org = orgs[i];
		orgMap[org.org_id] = org;
	}
	soql += ` WHERE OrgKey IN ('${orgIds.join("','")}')`;
	let query = (useBulkAPI ? conn.bulk.query(soql) : conn.query(soql))
	.on("record", rec => {
		let org = orgMap[rec.Id.substring(0, 15)];
		org.name = rec.OrgName;
		org.type = rec.OrgType;
		org.instance = rec.InstanceName;
		org.account_id = sfdc.INTERNAL_ID;
		org.modified_date = new Date().toISOString();
	})
	.on("end", async () => {
		await upsert(orgs, 2000);
	})
	.on("error", error => {
		logger.error("Failed to retrieve orgs", error);
	});

	if (!useBulkAPI) {
		await query.run({autoFetch: true, maxFetch: 100000});
	}
}

async function upsert(recs, batchSize) {
	let count = recs.length;
	if (count === 0) {
		logger.info("No new orgs found");
		return; // nothing to see here
	}
	logger.info(`New orgs found`, {count});
	for (let start = 0; start < count;) {
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = "INSERT INTO org (org_id, name, type, modified_date, account_id, status) VALUES";
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++}, null)`;
		values.push(rec.org_id, rec.name, rec.type, rec.modified_date, rec.account_id);
	}
	sql += ` on conflict (org_id) do update set name = excluded.name, type = excluded.type, status = null`;
	await db.insert(sql, values);
}

exports.fetch = fetch;
exports.refetchInvalid = refetchInvalid;