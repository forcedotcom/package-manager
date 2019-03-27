const db = require('../../util/pghelper');
const logger = require('../../util/logger').logger;
const orgpackageversions = require('../../api/orgpackageversions');

const SELECT_ALL = `SELECT distinct l.org_id, v.package_id, l.version_id, l.status, l.install_date, l.modified_date, l.expiration 
                    FROM license l
                    INNER JOIN package_version v on v.version_id = l.version_id`;

let adminJob;

async function fetch(fetchAll, job) {
	adminJob = job;

	let sql = SELECT_ALL;
	let values = ['Invalid'];
	let whereParts = [`l.status != $${values.length}`];
	if (!fetchAll) {
		let latest = await db.query(`select max(modified_date) from org_package_version`);
		if (latest.length > 0 && latest[0].max != null) {
			values.push(latest[0].max);
			whereParts.push(`l.modified_date > $${values.length}`);
		}
	}

	let where = ` WHERE ${whereParts.join(" AND ")}`;
	let recs = await db.query(sql + where, values);
	return upsert(recs, 2000);
}

async function upsert(recs, batchSize) {
	let count = recs.length;
	if (count === 0) {
		logger.info("No new org package versions found");
		return;
	}
	logger.info(`New org package versions found`, {count});
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Batch upserting org package versions`, {batch: start, count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let sql = `INSERT INTO org_package_version(org_id, package_id, version_id, license_status, install_date, modified_date) VALUES `;
	let values = [];
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;

		let licenseStatus = rec.status;
		if (rec.expiration != null && rec.expiration.getTime() < Date.now()) {
			licenseStatus = orgpackageversions.LicenseStatus.Expired;
		}
		
		values.push(rec.org_id, rec.package_id, rec.version_id, licenseStatus, rec.install_date, rec.modified_date);
	}
	sql += ` on conflict (org_id, package_id) do update set
        version_id = excluded.version_id, license_status = excluded.license_status, 
        install_date = excluded.install_date, modified_date = excluded.modified_date`;
	try {
		await db.insert(sql, values);
	} catch (e) {
		console.error("Failed to insert ", e.message);
	}
}

exports.fetch = fetch;