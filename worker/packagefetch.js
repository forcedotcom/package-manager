const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;
const packageorgs = require("../api/packageorgs");

const SELECT_ALL = `SELECT Id, Name, Status__c, sflma__Developer_Org_ID__c, sfLma__Package_ID__c, DependencyTier__c, LastModifiedDate
                    FROM sflma__Package__c`;

let adminJob;

async function fetch(fetchAll, job) {
	adminJob = job;

	const licenseOrgs = await packageorgs.retrieveByType([sfdc.OrgTypes.Licenses]);

	for (let i = 0; i < licenseOrgs.length; i++) {
		const lmaOrgId = licenseOrgs[i].org_id;
		try {
			await fetchFromOrg(lmaOrgId, fetchAll);
		} catch (e) {
			if (e.name === "invalid_grant") {
				packageorgs.updateOrgStatus(lmaOrgId, packageorgs.Status.Invalid)
					.then(() => {});
			}
		}
	}
}

async function fetchFromOrg(lmaOrgId, fetchAll) {
	let fromDate = null;
	if (!fetchAll) {
		let latest = await db.query(`select max(modified_date) from package WHERE license_org_id = $1`, [lmaOrgId]);
		if (latest.length > 0) {
			fromDate = latest[0].max;
		}
	}

	const recs = await query(lmaOrgId, fromDate);
	return upsert(recs, 2000);
}

async function query(lmaOrgId, fromDate) {
	let conn = await sfdc.buildOrgConnection(lmaOrgId);
	let soql = SELECT_ALL;
	if (fromDate) {
		soql += ` WHERE LastModifiedDate > ${fromDate.toISOString()}`;
	}
	let res = await conn.query(soql);
	return await load(res, conn, lmaOrgId);
}

async function fetchMore(nextRecordsUrl, conn, recs, lmaOrgId) {
	let result = await conn.requestGet(nextRecordsUrl);
	return recs.concat(await load(result, conn, lmaOrgId));
}

async function load(result, conn, lmaOrgId) {
	let recs = result.records.map(v => {
		return {
			sfid: v.Id, 
			name: v.Name, 
			status: v.Status__c,
			licence_org_id: lmaOrgId,
			package_org_id: v.sfLma__Developer_Org_ID__c,
			package_id: v.sfLma__Package_ID__c,
			dependency_tier: v.DependencyTier__c,
			modified_date: v.LastModifiedDate
		};
	});

	if (!result.done && !adminJob.canceled) {
		return fetchMore(result.nextRecordsUrl, conn, recs, lmaOrgId);
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
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Batch upserting package records`, {batch: start, count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [], params = [];
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		params.push(`$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++}`);
		values.push(rec.sfid, rec.name, rec.status, rec.license_org_id, rec.package_org_id, rec.package_id, rec.dependency_tier, rec.modified_date);
	}
	const sql =
		`INSERT INTO package (sfid, name, status, license_org_id, package_org_id, package_id, dependency_tier, modified_date) 
			VALUES (${params.join("),(")})
			on conflict (sfid) do update set
			name = excluded.name, status = excluded.status, license_org_id = excluded.license_org_id, 
			package_org_id = excluded.package_org_id, package_id = excluded.package_id,
			dependency_tier = excluded.dependency_tier, modified_date = excluded.modified_date`;
	await db.insert(sql, values);
}

exports.fetch = fetch;
exports.upsert = upsert;
