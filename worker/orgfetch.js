const db = require('../util/pghelper');
const opvapi = require('../api/orgpackageversions');
const orgsapi = require('../api/orgs');

let adminJob;

/**
 * Updates org details from information in this org's, or its parent org's, account
 */
async function updateOrgsFromAccounts(job) {
	adminJob = job;

	let sql = `UPDATE org o SET account_id = a.account_id, edition = a.edition FROM account a 
				WHERE o.org_id = a.org_id OR o.parent_org_id = a.org_id`;
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

async function updateOrgStatus(job) {
	adminJob = job;

	// Flip expired orgs to Expired and non-expired orgs to their license status
	await db.update(`
		UPDATE org_package_version opv
		SET install_date = l.install_date,
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
			AND opv.license_status IN ('${opvapi.LicenseStatus.Active}', '${opvapi.LicenseStatus.Trial}')
			GROUP BY o.org_id HAVING COUNT(opv.id) = 0)`);

	// Flip orgs WITH versions to status Installed
	await db.update(`UPDATE org SET status = '${orgsapi.Status.Installed}' WHERE status = '${orgsapi.Status.NotInstalled}' AND org_id IN
		  (SELECT o.org_id FROM org o 
			LEFT JOIN org_package_version opv ON opv.org_id = o.org_id 
			AND opv.license_status IN ('${opvapi.LicenseStatus.Active}', '${opvapi.LicenseStatus.Trial}')
			GROUP BY o.org_id HAVING COUNT(opv.id) > 0)`);
}

exports.updateOrgsFromAccounts = updateOrgsFromAccounts;
exports.updateChildrenFromParents = updateChildrenFromParents;
exports.updateOrgStatus = updateOrgStatus;
