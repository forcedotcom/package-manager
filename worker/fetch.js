const ps = require('./packagefetch');
const pvs = require('./packageversionfetch');
const licenses = require('./licensefetch');
const licenseorgs = require('./licenseorgfetch');
const orgs = require('./orgfetch');
const orgaccounts = require('./orgaccountfetch');
const accounts = require('./accountfetch');
const sfdc = require('../api/sfdcconn');
const orgpackageversions = require('./orgpackageversionfetch');
const admin = require('../api/admin');

const assetaccounts = require('./assetaccountfetch');
const accountorgs = require('./accountorgfetch');
const subs = require('./subscriberfetch');

const packageorgs = require('../api/packageorgs');

/**
 * Old way:
 * 1. Fetch all license records
 * 2. Derive unique set of production and sandbox orgs from license data
 * 3. Query production and sandbox blacktab to retrieve account for each org
 * 4. Query org62 to retrieve account names for each orgs using org's account id
 * 5. Populate org package versions from license data
 *
 * alternative 1: fetch2
 * 1. For each packaging org, fetch all subscribers.  Get both sandbox and production org ids, with link between them, along with org package version data.
 * 2. Query org62 for all org ids to retrieve account ids and names for each.
 * 3. Fill in account ids on sandbox org records using data from parent production org.
 *
 * BLOCKING this:
 * 1. Need to query subscribers by last modified date, and the subscriber API in general cannot timeout
 * 2. Subscriber API needs to expose Parent Org (aka Cloned From) field to link sandbox to production
 * Result: does not retrieve orgs that are licensed but not yet installed our package
 * 
 * alternative 2: fetchAccountOrgs
 * 1. Query licensed accounts from org62 using asset lines
 * 2. Query BT in batches to retrieve production and sandbox org info for all of our accounts
 * 3. Fetch all license records and populate org package versions from license data
 * Problems: ignores all internal orgs.  For testing purposes internal orgs have to be imported manually.  (Maybe okay?)
 * Step 3 should really be done by querying PackageSubscribers.  But that API doesn't scale enough to function except for small queries by org id. 
 */
function fetchAccountOrgs(fetchAll) {
	return new admin.AdminJob(
		admin.JobTypes.FETCH_ACCOUNT_ORGS,
		fetchAll ? "Fetch all account orgs" : "Fetch latest account orgs",
		[
			{
				name: "Fetching accounts from assets",
				handler: (job) => assetaccounts.fetch(sfdc.KnownOrgs.org62.orgId, fetchAll, job)
			},
			{
				name: "Fetching production org data",
				handler: (job) => accountorgs.fetch(sfdc.KnownOrgs.bt.orgId, fetchAll, job),
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs.bt.orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			},
			{
				name: "Fetching sandbox org data",
				handler: (job) => accountorgs.fetch(sfdc.KnownOrgs.sbt.orgId, fetchAll, job),
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs.sbt.orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			}
		]);
}

function fetch(fetchAll) {
	return new admin.AdminJob(
		admin.JobTypes.FETCH,
		fetchAll ? "Fetch all data" : "Fetch latest data",
		[
			{
				name: "Populating license data",
				steps: [
					{name: "Fetching packages", handler: (job) => ps.fetch(sfdc.KnownOrgs.lma.orgId, fetchAll, job)},
					{
						name: "Fetching package versions",
						handler: (job) => pvs.fetch(sfdc.KnownOrgs.lma.orgId, fetchAll, job)
					},
					{name: "Fetching latest package versions", handler: (job) => pvs.fetchLatest(job)},

					{
						name: "Fetching licenses",
						handler: (job) => licenses.fetch(sfdc.KnownOrgs.lma.orgId, fetchAll, job)
					},
					{name: "Invalidating conflicting licenses", handler: (job) => licenses.markInvalid(job)},
					{name: "Deriving orgs from licenses", handler: (job) => licenseorgs.fetch(fetchAll, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs.lma.orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			},
			{
				name: "Populating production org data",
				steps: [
					{
						name: "Fetching production orgs",
						handler: (job) => orgs.fetch(sfdc.KnownOrgs.bt.orgId, false, fetchAll, job)
					},
					{name: "Invalidating missing production orgs", handler: (job) => orgs.mark(false, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs.bt.orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			},
			{
				name: "Populating sandbox org data",
				steps: [
					{
						name: "Fetching sandbox orgs",
						handler: (job) => orgs.fetch(sfdc.KnownOrgs.sbt.orgId, true, fetchAll, job)
					},
					{name: "Invalidating missing sandbox orgs", handler: (job) => orgs.mark(true, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs.sbt.orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			},
			{
				name: "Populating org package versions",
				steps: [
					{
						name: "Deriving org package versions from licenses",
						handler: (job) => orgpackageversions.fetch(fetchAll, job)
					},
					{
						name: "Updating orgs with version counts",
						handler: (job) => orgpackageversions.updateOrgStatus(job)
					}]
			},
			{
				name: "Populating accounts data",
				steps: [
					{
						name: "Deriving accounts from orgs", 
						handler: (job) => orgaccounts.fetch(fetchAll, job)
					},
					{
						name: "Fetching account names",
						handler: (job) => accounts.fetch(sfdc.KnownOrgs.org62.orgId, fetchAll, job)
					},
					{
						name: "Updating orgs from accounts",
						handler: (job) => orgs.updateOrgsFromAccounts(job)
					}
					],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs.org62.orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			}
		]);
}

/**
 * 1. For each packaging org, fetch all subscribers.  Get both sandbox and production org ids, with link between them, along with org package version data.
 * 2. Query org62 for all org ids to retrieve account ids and names for each.
 * 3. Fill in account ids on sandbox org records using data from parent production org.
 */
function fetch2(fetchAll) {
	return new admin.AdminJob(
		admin.JobTypes.FETCH,
		fetchAll ? "Fetch all data" : "Fetch latest data",
		[
			{
				name: "Fetch subscriber orgs",
				steps: [
					{
						name: "Fetching CPQ subscribers",
						handler: (job) => subs.fetch(true, job)
					}
					],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs.bt.orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			}
		]);
}

/**
 * Fetch all orgs marked previously as invalid, in case any fell through the cracks before, or became valid again.
 * @returns {Promise<void>}
 */
function fetchInvalid() {
	return new admin.AdminJob(
		admin.JobTypes.FETCH_INVALID, "Fetch invalid org data",
		[
			{
				name: "Populating production org data",
				steps: [
					{
						name: "Fetching invalid production orgs",
						handler: (job) => orgs.refetchInvalid(sfdc.KnownOrgs.bt.orgId, false, job)
					},
					{name: "Invalidating missing production orgs", handler: (job) => orgs.mark(false, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs.bt.orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			},
			{
				name: "Populating sandbox org data",
				steps: [
					{
						name: "Fetching invalid sandbox orgs",
						handler: (job) => orgs.refetchInvalid(sfdc.KnownOrgs.sbt.orgId, true, job)
					},
					{name: "Invalidating missing sandbox orgs", handler: (job) => orgs.mark(true, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs.sbt.orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			},
			{
				name: "Populating accounts data",
				steps: [
					{name: "Deriving accounts from orgs", handler: (job) => orgaccounts.fetch(true, job)},
					{
						name: "Fetching account names",
						handler: (job) => accounts.fetch(sfdc.KnownOrgs.org62.orgId, true, job)
					}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs.org62.orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			}
		]);
}

function fetchOrgVersions(orgId, packageOrgIds) {
	return new admin.AdminJob(admin.JobTypes.REFRESH_GROUP_VERSIONS, "Fetch package versions installed on orgs",
		[
			{
				name: "Fetching package versions from subscribers",
				handler: (job) => orgpackageversions.fetchFromSubscribers(orgId, packageOrgIds, job),
			},
			{
				name: "Finish event",
				handler: () => 	admin.emit(admin.Events.ORG_VERSIONS, orgId)
			}
		]);
}

function fetchOrgGroupVersions(groupId, orgIds, packageOrgIds) {
	return new admin.AdminJob(admin.JobTypes.REFRESH_GROUP_VERSIONS, "Fetch package versions installed on orgs",
		[
			{
				name: "Fetching package versions from subscribers",
				handler: (job) => orgpackageversions.fetchFromSubscribers(orgIds, packageOrgIds, job),
			},
			{
				name: "Finish event",
				handler: () => 	admin.emit(admin.Events.GROUP_VERSIONS, groupId)
			}
		]);
}

exports.fetchAccountOrgs = fetchAccountOrgs;
exports.fetch = fetch;
exports.fetchInvalid = fetchInvalid;
exports.fetchOrgVersions = fetchOrgVersions;
exports.fetchOrgGroupVersions = fetchOrgGroupVersions;
