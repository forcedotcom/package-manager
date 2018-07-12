const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const SELECT_ALL = `SELECT Id, Name, sflma__Developer_Org_ID__c, sfLma__Package_ID__c, DependencyTier__c, LastModifiedDate
                    FROM sflma__Package__c`;

let adminJob;

async function fetch(sb62Id, fetchAll, job) {
	adminJob = job;

	let fromDate = null;
	if (!fetchAll) {
		let latest = await db.query(`select max(modified_date) from package`);
		if (latest.length > 0) {
			fromDate = latest[0].max;
		}
	}

	const recs = await query(sb62Id, fromDate);
	return upsert(recs, 2000);
}

async function query(sb62Id, fromDate) {
	let conn = await sfdc.buildOrgConnection(sb62Id);
	let soql = SELECT_ALL;
	soql += ` WHERE Status__c = 'Active'`;
	if (fromDate) {
		soql += ` AND LastModifiedDate > ${fromDate.toISOString()}`;
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
			sfid: v.Id, 
			name: v.Name, 
			package_org_id: v.sfLma__Developer_Org_ID__c,
			package_id: v.sfLma__Package_ID__c, 
			dependency_tier: v.DependencyTier__c, 
			modified_date: v.LastModifiedDate
		};
	});

	if (!result.done && !adminJob.cancelled) {
		return fetchMore(result.nextRecordsUrl, conn, recs);
	}
	return recs;
}

async function upsert(recs, batchSize) {
	let count = recs.length;
	if (count === 0) {
		logger.info("No new packages found");
		return; // nothing to see here
	}
	logger.info(`New packages found`, {count});
	for (let start = 0; start < count && !adminJob.cancelled;) {
		logger.info(`Batch upserting package records`, {batch: start, count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = "INSERT INTO package (sfid, name, package_org_id, package_id, dependency_tier, modified_date) VALUES";
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.sfid, rec.name, rec.package_org_id, rec.package_id, rec.dependency_tier, rec.modified_date);
	}
	sql += ` on conflict (sfid) do update set
        name = excluded.name, package_org_id = excluded.package_org_id, package_id = excluded.package_id,
        dependency_tier = excluded.dependency_tier, modified_date = excluded.modified_date`;
	await db.insert(sql, values);
}

exports.fetch = fetch;
exports.upsert = upsert;