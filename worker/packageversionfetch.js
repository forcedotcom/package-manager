const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const Status = require('../api/packageversions').Status;
const logger = require('../util/logger').logger;
const packageorgs = require("../api/packageorgs");

const SELECT_ALL = `SELECT Id, Name, sfLma__Version_Number__c, sfLma__Package__c, sfLma__Release_Date__c, Status__c, 
                    sfLma__Version_ID__c, CreatedDate, LastModifiedDate FROM sfLma__Package_Version__c`;

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
		let latest = await db.query(`select max(modified_date) from package_version WHERE license_org_id = $1`, [lmaOrgId]);
		if (latest.length > 0) {
			fromDate = latest[0].max;
		}
	}

	let recs = await query(lmaOrgId, fromDate);
	return upsert(recs, 2000);
}

async function query(lmaOrgId, fromDate) {
	let conn = await sfdc.buildOrgConnection(lmaOrgId);
	let whereParts = [`sfLma__Version_Number__c != null`];
	if (fromDate) {
		whereParts.push(`LastModifiedDate > ${fromDate.toISOString()}`);
	}
	let where = ` WHERE ${whereParts.join(" AND ")}`;
	let res = await conn.query(SELECT_ALL + where);
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
			license_org_id: lmaOrgId,
			version_number: v.sfLma__Version_Number__c,
			version_sort: toVersionSort(v.sfLma__Version_Number__c, new Date(v.CreatedDate)),
			major_version: v.sfLma__Version_Number__c ? v.sfLma__Version_Number__c.split(".")[0] : null,
			package_id: v.sfLma__Package__c,
			release_date: new Date(v.sfLma__Release_Date__c).toISOString(),
			created_date: new Date(v.CreatedDate).toISOString(),
			modified_date: new Date(v.LastModifiedDate).toISOString(),
			status: v.Status__c,
			version_id: v.sfLma__Version_ID__c
		};
	});
	if (!result.done && !adminJob.canceled) {
		return fetchMore(result.nextRecordsUrl, conn, recs, lmaOrgId);
	}
	return recs;
}

function toVersionSort(versionNumber, createdDate) {
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
	paddedNumbers.push("_", createdDate.getTime());
	return paddedNumbers.join("");
}

async function upsert(recs, batchSize) {
	let count = recs.length;
	if (count === 0) {
		logger.info("No new package versions found");
		return; // nothing to see here
	}
	logger.info(`New package versions found`, {count});
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Batch upserting package versions`, {batch: start, count: count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = `INSERT INTO package_version (sfid, name, license_org_id, version_number, version_sort, major_version, package_id,
               release_date, created_date, modified_date, status, version_id) VALUES `;
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.sfid, rec.name, rec.license_org_id, rec.version_number, rec.version_sort, rec.major_version, rec.package_id,
			rec.release_date, rec.created_date, rec.modified_date, rec.status, rec.version_id);
	}
	sql += ` on conflict (sfid) do update set
        name = excluded.name, license_org_id = excluded.license_org_id, version_number = excluded.version_number, 
        version_sort = excluded.version_sort, major_version = excluded.major_version, package_id = excluded.package_id, 
        release_date = excluded.release_date, modified_date = excluded.modified_date, 
        created_date = excluded.created_date, status = excluded.status, version_id = excluded.version_id`;
	await db.insert(sql, values);
}

async function fetchLatest(job) {
	adminJob = job;

	const licenseOrgs = await packageorgs.retrieveByType([sfdc.OrgTypes.Licenses]);
	for (let i = 0; i < licenseOrgs.length; i++) {
		const lmaOrgId = licenseOrgs[i].org_id;
		try {
			await fetchLatestFromOrg(lmaOrgId);
		} catch (e) {
			if (e.name === "invalid_grant") {
				packageorgs.updateOrgStatus(lmaOrgId, packageorgs.Status.Invalid)
					.then(() => {});
			}
		}
	}
}

async function fetchLatestFromOrg(lmaOrgId) {
	let latest = await queryLatest(lmaOrgId);
	const latestByPackage = new Map(
		latest.map(l => [l.package_id, {
			package_id: l.package_id,
			limited_version_id: l.version_id,
			limited_version_number: l.version_number,
			limited_version_sort: l.version_sort
	}]));

	let latestLimited = await queryLatest(lmaOrgId, [Status.PreRelease, Status.Verified, Status.Limited, Status.Preview]);
	latestLimited.forEach(l => {
		const pvl = latestByPackage.get(l.package_id);
		pvl.limited_version_id = l.version_id;
		pvl.limited_version_number = l.version_number;
		pvl.limited_version_sort = l.version_sort;
	});

	let latestValid = await queryLatest(lmaOrgId, [Status.PreRelease, Status.Verified]);
	latestValid.forEach(l => {
		const pvl = latestByPackage.get(l.package_id);
		pvl.version_id = l.version_id;
		pvl.version_number = l.version_number;
		pvl.version_sort = l.version_sort;
	});

	if (adminJob.canceled)
		return;

	return upsertLatest(Array.from(latestByPackage.values()));
}

async function queryLatest(lmaOrgId, status) {
	let where = [`license_org_id = $1`];
	if (status) {
		let params = status.map((s,i) => '$' + (i+2));
		where.push(`status IN (${params.join(",")})`);
	}

	let sql = `SELECT v.package_id, v.version_id, v.version_number, v.version_sort FROM
        (SELECT package_id, MAX(version_sort) version_sort FROM package_version
         WHERE ${where.join('AND')} 
         GROUP BY package_id) x
        INNER JOIN package_version v ON v.package_id = x.package_id AND v.version_sort = x.version_sort`;
	return db.query(sql, status);
}

async function upsertLatest(recs) {
	let values = [], params = [];
	recs.forEach(rec => {
		let n = 0;
		params.push(`$${++n},$${++n},$${++n},$${++n},$${++n},$${++n},$${++n}`);
		values.push(rec.package_id, rec.version_id, rec.version_number, rec.version_sort, rec.limited_version_id, rec.limited_version_number, rec.limited_version_sort);
	});

	let sql =
		`INSERT INTO package_version_latest (package_id, version_id, version_number, version_sort, limited_version_id, limited_version_number, limited_version_sort) 
		VALUES (${params.join("),(")})
	 	ON CONFLICT (package_id) DO UPDATE SET
        version_id = excluded.version_id, version_number = excluded.version_number, version_sort = excluded.version_sort, 
        limited_version_id = excluded.limited_version_id, limited_version_number = excluded.limited_version_number, limited_version_sort = excluded.limited_version_sort`;
	await db.insert(sql, values);
}

exports.fetch = fetch;
exports.fetchLatest = fetchLatest;
exports.upsert = upsert;
