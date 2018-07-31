const db = require('../util/pghelper');
const logger = require('../util/logger').logger;
const orgsapi = require('../api/orgs');
const orgpackageversions = require('../api/orgpackageversions');
const push = require('./packagepush');

const SELECT_ALL = `SELECT distinct l.org_id, v.package_id, l.package_version_id, l.status, l.modified_date, l.expiration 
                    FROM license l
                    INNER JOIN package_version v on v.sfid = l.package_version_id`;

let adminJob;

async function fetchFromSubscribers(orgIds, packageOrgIds, job) {
	adminJob = job;

	if (!packageOrgIds) {
		let i = 1;
		let params = orgIds.map(() => `$${i++}`);
		packageOrgIds = (await db.query(
			`SELECT DISTINCT p.package_org_id
                             FROM package p
                             INNER JOIN org_package_version opv on opv.package_id = p.sfid
                             WHERE opv.org_id IN (${params.join(",")})`, orgIds)).map(p => p.package_org_id);
	}
	const missingOrgIds = new Set(orgIds);
	
	job.postMessage(`Querying ${packageOrgIds.length} package orgs`);
	let arrs = await push.bulkFindSubscribersByIds(packageOrgIds, orgIds);
	let opvs = [];
	for (let i = 0; i < arrs.length; i++) {
		const arr = arrs[i];
		if (!Array.isArray(arr)) {
			// Error!
			job.postMessage(`Error: ${arr}`);
			continue;
		}
		
		opvs = opvs.concat(arr.map(rec => {
			// Found! So remove from missing list and add as an Active license
			const orgId = rec.OrgKey.substring(0, 15);
			missingOrgIds.delete(orgId); 
			return {
				org_id: orgId,
				version_id: rec.MetadataPackageVersionId,
				license_status: orgpackageversions.LicenseStatus.Active
			}
		}));
	}
	job.postMessage(`Fetched ${opvs.length} package subscribers, with ${missingOrgIds.size} missing orgs`);
	missingOrgIds.forEach((value) => {
		opvs.push({version_id: null, org_id: value, license_status: orgpackageversions.LicenseStatus.NotFound});
	});
	if (opvs.length > 0) {
		let res = await orgpackageversions.insertOrgPackageVersions(opvs);
		job.postMessage(`Updated ${res.length} org package versions`);
	}
}

async function fetchFromLicenses(fetchAll, job) {
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

async function updateOrgStatus(job) {
	adminJob = job;

	let n = 0;
	// Flip orgs MISSING versions to status Not Installed
	await db.update(`UPDATE org SET status = $${++n} WHERE status = $${++n} AND org_id IN
		  (SELECT o.org_id FROM org o 
			LEFT JOIN org_package_version opv ON opv.org_id = o.org_id AND opv.license_status IN ($${++n}, $${++n})
			GROUP BY o.org_id HAVING COUNT(opv.id) = 0)`, 
			[orgsapi.Status.NotInstalled, orgsapi.Status.Installed,
				orgpackageversions.LicenseStatus.Active, orgpackageversions.LicenseStatus.Trial]);

	// Flip orgs WITH versions to status Installed
	n = 0;
	await db.update(`UPDATE org SET status = $${++n} WHERE status = $${++n} AND org_id IN
		  (SELECT o.org_id FROM org o 
			LEFT JOIN org_package_version opv ON opv.org_id = o.org_id AND opv.license_status IN ($${++n}, $${++n})
			GROUP BY o.org_id HAVING COUNT(opv.id) > 0)`, 
				[orgsapi.Status.Installed, orgsapi.Status.NotInstalled],
					orgpackageversions.LicenseStatus.Active, orgpackageversions.LicenseStatus.Trial);
}

async function upsert(recs, batchSize) {
	let count = recs.length;
	if (count === 0) {
		logger.info("No new org package versions found");
		return;
	}
	logger.info(`New org package versions found`, {count});
	for (let start = 0; start < count && !adminJob.cancelled;) {
		logger.info(`Batch upserting org package versions`, {batch: start, count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let sql = `INSERT INTO org_package_version(org_id, package_id, package_version_id, license_status, modified_date) VALUES `;
	let values = [];
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;

		let licenseStatus = rec.status;
		if (rec.expiration != null && rec.expiration.getTime() < Date.now()) {
			licenseStatus = orgpackageversions.LicenseStatus.Expired;
		}
		
		values.push(rec.org_id, rec.package_id, rec.package_version_id, licenseStatus, rec.modified_date);
	}
	sql += ` on conflict (org_id, package_id) do update set
        package_version_id = excluded.package_version_id, license_status = excluded.license_status, modified_date = excluded.modified_date`;
	try {
		await db.insert(sql, values);
	} catch (e) {
		console.error("Failed to insert ", e.message);
	}
}


exports.fetch = fetchFromLicenses;
exports.fetchFromSubscribers = fetchFromSubscribers;
exports.updateOrgStatus = updateOrgStatus;