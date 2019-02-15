const db = require('../util/pghelper');
const logger = require('../util/logger').logger;
const orgsapi = require('../api/orgs');
const sfdc = require('../api/sfdcconn');
const orgpackageversions = require('../api/orgpackageversions');
const push = require('./packagepush');

const SELECT_ALL = `SELECT distinct l.org_id, v.package_id, l.version_id, l.status, l.install_date, l.modified_date, l.expiration 
                    FROM license l
                    INNER JOIN package_version v on v.version_id = l.version_id`;

let adminJob;

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

	// Flip expired orgs to Expired and non-expired orgs to their license status
	await db.update(`
		UPDATE org_package_version opv
		SET modified_date  = l.modified_date,
			license_status =
				CASE
					WHEN l.expiration <= NOW() THEN 'Expired'
					ELSE l.status
					END
		FROM license l
		WHERE l.org_id = opv.org_id AND l.version_id = opv.version_id`);

	// Flip orgs MISSING versions to status Not Installed
	await db.update(`UPDATE org SET status = '${orgsapi.Status.NotInstalled}' WHERE status = '${orgsapi.Status.Installed}' AND org_id IN
		  (SELECT o.org_id FROM org o 
			LEFT JOIN org_package_version opv ON opv.org_id = o.org_id 
			AND opv.license_status IN ('${orgpackageversions.LicenseStatus.Active}', '${orgpackageversions.LicenseStatus.Trial}')
			GROUP BY o.org_id HAVING COUNT(opv.id) = 0)`);

	// Flip orgs WITH versions to status Installed
	await db.update(`UPDATE org SET status = '${orgsapi.Status.Installed}' WHERE status = '${orgsapi.Status.NotInstalled}' AND org_id IN
		  (SELECT o.org_id FROM org o 
			LEFT JOIN org_package_version opv ON opv.org_id = o.org_id 
			AND opv.license_status IN ('${orgpackageversions.LicenseStatus.Active}', '${orgpackageversions.LicenseStatus.Trial}')
			GROUP BY o.org_id HAVING COUNT(opv.id) > 0)`);
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


async function fetchFromSubscribers(orgId, packageOrgIds, job) {
	adminJob = job;
	const orgIds = Array.isArray(orgId) ? orgId : [orgId];

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

	job.postDetail(`Querying ${packageOrgIds.length} org connections`);
	let arrs = await push.bulkFindSubscribersByIds(packageOrgIds, orgIds);
	let opvs = [];
	for (let i = 0; i < arrs.length; i++) {
		const arr = arrs[i];
		if (!Array.isArray(arr)) {
			// Error!
			job.postDetail(`Error: ${arr}`);
			continue;
		}

		opvs = opvs.concat(arr.map(rec => {
			// Found! So remove from missing list and add as an Active license
			const orgId = sfdc.normalizeId(rec.OrgKey);
			missingOrgIds.delete(orgId);
			return {
				org_id: orgId,
				version_id: rec.MetadataPackageVersionId,
				license_status: orgpackageversions.LicenseStatus.Active,
				modified_date: new Date().toISOString()
			}
		}));
	}
	job.postDetail(`Fetched ${opvs.length} package subscribers, with ${missingOrgIds.size} missing orgs`);
	missingOrgIds.forEach((value) => {
		opvs.push({
			version_id: null,
			org_id: value,
			license_status: orgpackageversions.LicenseStatus.NotFound,
			modified_date: new Date().toISOString()
		});
	});
	if (opvs.length > 0) {
		let res = await orgpackageversions.insertOrgPackageVersions(opvs);
		job.postDetail(`Updated ${res.length} org package versions`);
	}
}

exports.fetch = fetchFromLicenses;
exports.fetchFromSubscribers = fetchFromSubscribers;
exports.updateOrgStatus = updateOrgStatus;