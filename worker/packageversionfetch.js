const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const SELECT_ALL = `SELECT Id, Name, sfLma__Version_Number__c, sfLma__Package__c, sfLma__Release_Date__c, Status__c, 
                    sfLma__Version_ID__c, LastModifiedDate FROM sfLma__Package_Version__c`;

let adminJob;

async function fetch(sb62Id, fetchAll, job) {
	adminJob = job;
	let fromDate = null;
	if (!fetchAll) {
		let latest = await db.query(`select max(modified_date) from package_version`);
		if (latest.length > 0) {
			fromDate = latest[0].max;
		}
	}

	let recs = await query(sb62Id, fromDate);
	return upsert(recs, 2000);
}

async function query(sb62Id, fromDate) {
	let conn = await sfdc.buildOrgConnection(sb62Id);
	let whereParts = [`sfLma__Version_Number__c != null`];
	if (fromDate) {
		whereParts.push(`LastModifiedDate > ${fromDate.toISOString()}`);
	}
	let where = ` WHERE ${whereParts.join(" AND ")}`;
	let res = await conn.query(SELECT_ALL + where);
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
			version_number: v.sfLma__Version_Number__c,
			version_sort: toVersionSort(v.sfLma__Version_Number__c),
			major_version: v.sfLma__Version_Number__c ? v.sfLma__Version_Number__c.split(".")[0] : null,
			package_id: v.sfLma__Package__c,
			release_date: new Date(v.sfLma__Release_Date__c).toISOString(),
			modified_date: new Date(v.LastModifiedDate).toISOString(),
			status: v.Status__c,
			version_id: v.sfLma__Version_ID__c
		};
	});
	if (!result.done && !adminJob.cancelled) {
		return fetchMore(result.nextRecordsUrl, conn, recs);
	}
	return recs;
}

function toVersionSort(versionNumber) {
	let segments = versionNumber.split(".");
	while (segments.length < 3) {
		segments.push("0");
	}
	let paddedNumbers = segments.map(n => {
		let s = n;
		while (s.length < 4) {
			s = "0" + s;
		}
		return s;
	});
	return paddedNumbers.join("");
}

async function upsert(recs, batchSize) {
	let count = recs.length;
	if (count === 0) {
		logger.info("No new package versions found");
		return; // nothing to see here
	}
	logger.info(`New package versions found`, {count});
	for (let start = 0; start < count && !adminJob.cancelled;) {
		logger.info(`Batch upserting package versions`, {batch: start, count: count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = `INSERT INTO package_version (sfid, name, version_number, version_sort, major_version, package_id,
               release_date, modified_date, status, version_id) VALUES `;
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.sfid, rec.name, rec.version_number, rec.version_sort, rec.major_version, rec.package_id,
			rec.release_date, rec.modified_date, rec.status, rec.version_id);
	}
	sql += ` on conflict (sfid) do update set
        name = excluded.name, version_number = excluded.version_number, version_sort = excluded.version_sort, major_version = excluded.major_version,
        package_id = excluded.package_id, release_date = excluded.release_date, modified_date = excluded.modified_date, 
        status = excluded.status, version_id = excluded.version_id`;
	await db.insert(sql, values);
}

async function fetchLatest(job) {
	adminJob = job;

	let recs = await queryLatest();
	if (adminJob.cancelled)
		return;

	return upsertLatest(recs);
}

async function queryLatest(packageIds) {
	let whereParts = ["status IN ('Pre-Release', 'Verified')"], values = [];

	if (packageIds) {
		let params = [];
		for (let i = 1; i <= packageIds.length; i++) {
			params.push('$' + i);
		}
		whereParts.push(`package_id IN (${params.join(",")})`);
	}

	let where = whereParts.length > 0 ? ` WHERE ${whereParts.join(" AND ")}` : "";

	let sql = `SELECT v.package_id, v.sfid, v.version_id, v.name, v.version_number FROM
        (SELECT package_id, MAX(version_sort) version_sort FROM package_version
         ${where} 
         GROUP BY package_id) x
        INNER JOIN package_version v ON v.package_id = x.package_id AND v.version_sort = x.version_sort`;

	return db.query(sql, values);
}

async function upsertLatest(recs) {
	let values = [];
	let sql = `INSERT INTO package_version_latest (package_id, sfid, version_id, name, version_number) VALUES `;
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.package_id, rec.sfid, rec.version_id, rec.name, rec.version_number);
	}
	sql += ` on conflict (package_id) do update set
        sfid = excluded.sfid, version_id = excluded.version_id, name = excluded.name, version_number = excluded.version_number`;
	await db.insert(sql, values);
}

exports.fetch = fetch;
exports.fetchLatest = fetchLatest;
exports.upsert = upsert;