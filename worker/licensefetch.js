const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const SELECT_ALL = `SELECT Id, LastModifiedDate, Name, sfLma__Subscriber_Org_ID__c, sfLma__Org_Instance__c, sfLma__License_Type__c, 
    sfLma__Subscriber_Org_Is_Sandbox__c, sfLma__Status__c, sfLma__Install_Date__c, sfLma__Expiration__c, 
    sfLma__Used_Licenses__c, sfLma__Package__c, sfLma__Package_Version__r.sfLma__Version_ID__c FROM sfLma__License__c`;

let adminJob;

async function fetch(lmaOrgId, fetchAll, job) {
	adminJob = job;
	let fromDate = null;
	if (!fetchAll) {
		let latest = await db.query(`select max(modified_date) max from license`);
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
		soql += ` WHERE LastModifiedDate > ${fromDate.toISOString()}`;
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
			org_id: v.sfLma__Subscriber_Org_ID__c,
			instance: v.sfLma__Org_Instance__c,
			type: v.sfLma__License_Type__c,
			is_sandbox: v.sfLma__Subscriber_Org_Is_Sandbox__c,
			status: v.sfLma__Status__c,
			install_date: v.sfLma__Install_Date__c,
			modified_date: v.LastModifiedDate,
			expiration: v.sfLma__Expiration__c,
			used_license_count: v.sfLma__Used_Licenses__c,
			package_id: v.sfLma__Package__c,
			version_id: v.sfLma__Package_Version__r ? v.sfLma__Package_Version__r.sfLma__Version_ID__c : null
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
		logger.info("No new licenses found in LMA");
		adminJob.postDetail(`No new licenses found in LMA`);
		return; // nothing to see here
	}

	adminJob.postDetail(`Storing ${count} license records from LMA`);
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Batch upserting license records`, {batch: Math.min(start + batchSize, count), count: count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = `INSERT INTO license (sfid, name, org_id, instance, type, is_sandbox, status, install_date, modified_date,
            expiration, used_license_count, package_id, version_id) VALUES`;
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.sfid, rec.name, rec.org_id, rec.instance, rec.type, rec.is_sandbox, rec.status, rec.install_date,
			rec.modified_date, rec.expiration, rec.used_license_count, rec.package_id, rec.version_id);
	}
	sql += ` on conflict (sfid) do update set
        name = excluded.name, org_id = excluded.org_id, instance = excluded.instance, type = excluded.type, 
        is_sandbox = excluded.is_sandbox, status = excluded.status, install_date = excluded.install_date,
        modified_date = excluded.modified_date, expiration = excluded.expiration, used_license_count = excluded.used_license_count,
        package_id = excluded.package_id, version_id = excluded.version_id`;
	await db.insert(sql, values);
}

async function markInvalid() {
	let dupes = await db.query(`
        SELECT distinct l.org_id, v.package_id
        FROM license l
        INNER JOIN package_version v on v.version_id = l.version_id
        group by l.org_id, v.package_id having count(*) > 1`);
	let dupeOrgIds = dupes.map(r => r.org_id);
	let dupePkgIds = dupes.map(r => r.package_id);

	let prev = null;
	let invalidIds = [];
	dupes = await db.query(`
        SELECT l.id, l.org_id, v.package_id, v.version_number, v.version_sort
        FROM license l
        INNER JOIN package_version v on v.version_id = l.version_id
        WHERE l.org_id IN ('${dupeOrgIds.join("','")}')
        AND v.package_id IN ('${dupePkgIds.join("','")}')
        ORDER BY org_id, package_id, version_sort desc`);
	for (let i = 0; i < dupes.length; i++) {
		let dupe = dupes[i];
		let curr = dupe.org_id + dupe.package_id;
		if (curr === prev) {
			invalidIds.push(dupe.id);
		}
		prev = curr;
	}

	if (invalidIds.length > 0) {
		const sql = `UPDATE license SET status = 'Invalid' 
						 WHERE id IN ('${invalidIds.join("','")}')`;
		await db.update(sql);
	}
}

exports.fetch = fetch;
exports.markInvalid = markInvalid;