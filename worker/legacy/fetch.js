const ps = require('../packagefetch');
const pvs = require('../packageversionfetch');
const licenses = require('../licensefetch');
const licenseorgs = require('./licenseorgfetch');
const orgs = require('../orgfetch');
const legacyorgs = require('./legacyorgfetch');
const orgaccounts = require('./orgaccountfetch');
const accounts = require('./accountdetailfetch');
const accountsbyorg = require('../accountfetch');
const sfdc = require('../../api/sfdcconn');
const orgpackageversions = require('./orgpackageversionfetch');
const admin = require('../../api/admin');

const assetaccounts = require('./assetaccountfetch');
const accountorgs = require('./accountorgfetch');

const packageorgs = require('../../api/packageorgs');

const OrgTypes = {
	ProductionBlacktab: "Production Blacktab",
	SandboxBlacktab: "Sandbox Blacktab"
};

/**
 * 1. Fetch all license records
 * 2. Derive unique set of production and sandbox orgs from license data
 * 3. Query production and sandbox blacktab to retrieve account for each org
 * 4. Query org62 to retrieve account names for each orgs using org's account id
 * 5. Populate org package versions from license data
 */
function fetch(fetchAll) {
	return new admin.AdminJob(
		admin.JobTypes.FETCH,
		fetchAll ? "Fetch all data" : "Fetch latest data",
		[
			{
				name: "Populating license data",
				steps: [
					{
						name: "Fetching licenses",
						handler: (job) => licenses.fetch(sfdc.KnownOrgs[sfdc.OrgTypes.Licenses].orgId, fetchAll, job)
					},
					{
						name: "Invalidating conflicting licenses",
						handler: (job) => licenses.markInvalid(job)
					},
					{
						name: "Deriving orgs from licenses",
						handler: (job) => licenseorgs.fetch(fetchAll, job)
					}
				],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						orgs.updateOrgStatus(sfdc.KnownOrgs[sfdc.OrgTypes.Licenses].orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			},
			{
				name: "Populating package data",
				steps: [
					{
						name: "Fetching packages",
						handler: (job) => ps.fetch(sfdc.KnownOrgs[sfdc.OrgTypes.Licenses].orgId, fetchAll, job)
					},
					{
						name: "Fetching package versions",
						handler: (job) => pvs.fetch(sfdc.KnownOrgs[sfdc.OrgTypes.Licenses].orgId, fetchAll, job)
					},
					{
						name: "Fetching latest package versions",
						handler: (job) => pvs.fetchLatest(job)
					}
				],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs[sfdc.OrgTypes.Licenses].orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			}, sfdc.KnownOrgs[OrgTypes.ProductionBlacktab] ?
			{
				name: "Populating production org data",
				steps: [
					{
						name: "Fetching production orgs",
						handler: (job) => legacyorgs.fetch(sfdc.KnownOrgs[OrgTypes.ProductionBlacktab].orgId, false, fetchAll, job)
					},
					{name: "Invalidating missing production orgs", handler: (job) => legacyorgs.mark(false, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs[OrgTypes.ProductionBlacktab].orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			} : {
				name: "Skipping production org data.  No Production blacktab org connection found.",
			}, sfdc.KnownOrgs[OrgTypes.SandboxBlacktab] ?
			{
				name: "Populating sandbox org data",
				steps: [
					{
						name: "Fetching sandbox orgs",
						handler: (job) => legacyorgs.fetch(sfdc.KnownOrgs[OrgTypes.SandboxBlacktab].orgId, true, fetchAll, job)
					},
					{name: "Invalidating missing sandbox orgs", handler: (job) => legacyorgs.mark(true, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs[OrgTypes.SandboxBlacktab].orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			} : {
			name: "Skipping production org data.  No Sandbox blacktab org connection found.",
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
						handler: (job) => orgs.updateOrgStatus(job)
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
						handler: (job) => accounts.fetch(sfdc.KnownOrgs[sfdc.OrgTypes.Accounts].orgId, fetchAll, job)
					},
					{
						name: "Updating orgs from accounts",
						handler: (job) => orgs.updateOrgsFromAccounts(job)
					}
					],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs[sfdc.OrgTypes.Accounts].orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			}
		]);
}

function fetchAccounts(fetchAll) {
	return new admin.AdminJob(
		admin.JobTypes.FETCH_ACCOUNTS,
		fetchAll ? "Fetch all accounts" : "Fetch latest accounts",
		[
			{
				name: "Fetching accounts",
				// handler: (job) => allaccounts.fetch(sfdc.KnownOrgs[sfdc.OrgTypes.Accounts].orgId, fetchAll, job),
				handler: (job) => accountsbyorg.fetch(sfdc.KnownOrgs[sfdc.OrgTypes.Accounts].orgId, fetchAll, job),
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs[sfdc.OrgTypes.Accounts].orgId, packageorgs.Status.Invalid)
							.then(() => {
						});
					}
				}
			}
		]);
}

/**
 * 1. Query licensed accounts from org62 using asset lines
 * 2. Query BT in batches to retrieve production and sandbox org info for all of our accounts
 * 3. Fetch all license records and populate org package versions from license data
 * Problems: ignores all internal orgs.  For testing purposes internal orgs have to be imported manually.  (Maybe okay?)
 * Step 3 should really be done by querying PackageSubscribers.  But that API doesn't scale enough to function except for small queries by org id.
 */
function fetchByAccountOrgs(fetchAll) {
	return new admin.AdminJob(
		admin.JobTypes.FETCH_ACCOUNT_ORGS,
		fetchAll ? "Fetch all account orgs" : "Fetch latest account orgs",
		[
			{
				name: "Fetching accounts from assets",
				handler: (job) => assetaccounts.fetch(sfdc.KnownOrgs[sfdc.OrgTypes.Accounts].orgId, fetchAll, job)
			},
			{
				name: "Fetching production org data",
				handler: (job) => accountorgs.fetch(sfdc.KnownOrgs[OrgTypes.ProductionBlacktab].orgId, fetchAll, job),
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs[OrgTypes.ProductionBlacktab].orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			},
			{
				name: "Fetching sandbox org data",
				handler: (job) => accountorgs.fetch(sfdc.KnownOrgs[OrgTypes.SandboxBlacktab].orgId, fetchAll, job),
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs[OrgTypes.SandboxBlacktab].orgId, packageorgs.Status.Invalid).then(() => {});
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
						handler: (job) => legacyorgs.refetchInvalid(sfdc.KnownOrgs[OrgTypes.ProductionBlacktab].orgId, false, job)
					},
					{name: "Invalidating missing production orgs", handler: (job) => legacyorgs.mark(false, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs[OrgTypes.ProductionBlacktab].orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			},
			{
				name: "Populating sandbox org data",
				steps: [
					{
						name: "Fetching invalid sandbox orgs",
						handler: (job) => legacyorgs.refetchInvalid(sfdc.KnownOrgs[OrgTypes.SandboxBlacktab].orgId, true, job)
					},
					{name: "Invalidating missing sandbox orgs", handler: (job) => legacyorgs.mark(true, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs[OrgTypes.SandboxBlacktab].orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			},
			{
				name: "Populating accounts data",
				steps: [
					{name: "Deriving accounts from orgs", handler: (job) => orgaccounts.fetch(true, job)},
					{
						name: "Fetching account names",
						handler: (job) => accounts.fetch(sfdc.KnownOrgs[sfdc.OrgTypes.Accounts].orgId, true, job)
					}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.KnownOrgs[sfdc.OrgTypes.Accounts].orgId, packageorgs.Status.Invalid).then(() => {});
					}
				}
			}
		]);
}

exports.fetchAccounts = fetchAccounts;
exports.fetchAccountOrgs = fetchByAccountOrgs;
exports.fetch = fetch;
exports.fetchInvalid = fetchInvalid;