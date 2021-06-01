const db = require('../util/pghelper');
const opvapi = require('../api/orgpackageversions');
const orgsapi = require('../api/orgs');
const request = require('request');

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

async function updateOrgLocation(job) {
	adminJob = job;

	try {
		let query = ` SELECT DISTINCT ON (instance) instance AS key, org_location, org_env, org_release, org_status FROM org `;
		let orgs_from_db = await db.query(query);

		let response = await promisifiedRequest('https://api.status.salesforce.com/v1/instances');
		const orgs_from_api = JSON.parse(response.body);

		orgs_from_db.forEach(async (org_from_db) => {
			let org_from_api = orgs_from_api.find(org => {
				return org.key == org_from_db.key
			});
			if (org_from_api) {
				if ( org_from_api.location != org_from_db.org_location || org_from_api.environment != org_from_db.org_env 
					|| org_from_api.releaseNumber != org_from_db.org_release || org_from_api.status != org_from_db.org_status) {
					
					let sql = ` UPDATE org SET org_location = '${org_from_api.location}', org_env = '${org_from_api.environment}', `
					    	+ ` org_release = '${org_from_api.releaseNumber}', org_status = '${org_from_api.status}' `
							+ ` WHERE instance = '${org_from_api.key}' `;
					let res = await db.update(sql);
					if (res.length > 0) {
						adminJob.postDetail(`Updated ${res.length} orgs from ${org_from_api.key} instance`);
					}

				}
			}
		})
	} catch (e) {
		console.error(e);
	}
	
}

async function updateOrgStatus(job) {
	adminJob = job;

	// Flip expired orgs to Expired and non-expired orgs to their license status
	await opvapi.updateFromLicenseStatus();

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

const promisifiedRequest = function(options) {
	return new Promise((resolve,reject) => {
		request(options, (error, response, body) => {
		if (response) {
			return resolve(response);
		}
		if (error) {
			return reject(error);
		}
		});
	});
};

exports.updateOrgsFromAccounts = updateOrgsFromAccounts;
exports.updateChildrenFromParents = updateChildrenFromParents;
exports.updateOrgStatus = updateOrgStatus;
exports.updateOrgLocation = updateOrgLocation;
