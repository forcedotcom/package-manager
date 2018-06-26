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

const packageorgs = require('../api/packageorgs');

/**
 * Old way:
 * 1. Fetch all license records and derive unique set of org ids from it, both production and sandboxes.
 * 2. Query production and sandbox blacktab to retrieve account ids for each org
 * 3. Query org62 to retrieve account names for each orgs using org's account id
 * 4. Populate org package versions from license data
 *
 * 1. For each packaging org, fetch all subscribers.  Get both sandbox and production org ids, with link between them, along with org package version data.
 * 2. Query org62 for all org ids to retrieve account ids and names for each.
 * 3. Fill in account ids on sandbox org records using data from parent production org.
 *
 * BLOCKING the new way:
 * 1. Need to query subscribers by last modified date, and the subscriber API in general cannot timeout
 * 2. Subscriber API needs to expose Parent Org (aka Cloned From) field to link sandbox to production
 */
function newfetch(fetchAll) {}

function fetch(fetchAll) {
	return new admin.AdminJob(
		fetchAll ? "fetch-all" : "fetch-latest",
		fetchAll ? "Fetch all data" : "Fetch latest data",
		[
			{
				name: "Populating license data",
				steps: [
					{name: "Fetching packages", handler: (job) => ps.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll, job)},
					{
						name: "Fetching package versions",
						handler: (job) => pvs.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll, job)
					},
					{name: "Fetching latest package versions", handler: (job) => pvs.fetchLatest(job)},

					{
						name: "Fetching licenses",
						handler: (job) => licenses.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll, job)
					},
					{name: "Invalidating conflicting licenses", handler: (job) => licenses.markInvalid(job)},
					{name: "Deriving orgs from licenses", handler: (job) => licenseorgs.fetch(fetchAll, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.NamedOrgs.sb62.orgId, packageorgs.Status.Invalid);
					}
				}
			},
			{
				name: "Populating production org data",
				steps: [
					{
						name: "Fetching production orgs",
						handler: (job) => orgs.fetch(sfdc.NamedOrgs.bt.orgId, fetchAll, job)
					},
					{name: "Invalidating missing production orgs", handler: (job) => orgs.mark(false, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.NamedOrgs.bt.orgId, packageorgs.Status.Invalid);
					}
				}
			},
			{
				name: "Populating sandbox org data",
				steps: [
					{
						name: "Fetching sandbox orgs",
						handler: (job) => orgs.fetch(sfdc.NamedOrgs.sbt.orgId, fetchAll, job)
					},
					{name: "Invalidating missing sandbox orgs", handler: (job) => orgs.mark(true, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.NamedOrgs.sbt.orgId, packageorgs.Status.Invalid);
					}
				}
			},
			{
				name: "Populating org package versions",
				steps: [
					{
						name: "Deriving org package versions from licenses",
						handler: (job) => orgpackageversions.fetch(fetchAll, job)
					}]
			},
			{
				name: "Populating accounts data",
				steps: [
					{name: "Deriving accounts from orgs", handler: (job) => orgaccounts.fetch(fetchAll, job)},
					{
						name: "Fetching account names",
						handler: (job) => accounts.fetch(sfdc.NamedOrgs.org62.orgId, fetchAll, job)
					}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.NamedOrgs.org62.orgId, packageorgs.Status.Invalid);
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
	return new admin.AdminJob("fetch-invalid", "Fetch invalid org data",
		[
			{
				name: "Populating production org data",
				steps: [
					{
						name: "Fetching invalid production orgs",
						handler: (job) => orgs.refetchInvalid(sfdc.NamedOrgs.bt.orgId, job)
					},
					{name: "Invalidating missing production orgs", handler: (job) => orgs.mark(false, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.NamedOrgs.bt.orgId, packageorgs.Status.Invalid);
					}
				}
			},
			{
				name: "Populating sandbox org data",
				steps: [
					{
						name: "Fetching invalid sandbox orgs",
						handler: (job) => orgs.fetch(sfdc.NamedOrgs.sbt.orgId, job)
					},
					{name: "Invalidating missing sandbox orgs", handler: (job) => orgs.mark(true, job)}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.NamedOrgs.sbt.orgId, packageorgs.Status.Invalid);
					}
				}
			},
			{
				name: "Populating accounts data",
				steps: [
					{name: "Deriving accounts from orgs", handler: (job) => orgaccounts.fetch(true, job)},
					{
						name: "Fetching account names",
						handler: (job) => accounts.fetch(sfdc.NamedOrgs.org62.orgId, true, job)
					}],
				fail: (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus(sfdc.NamedOrgs.org62.orgId, packageorgs.Status.Invalid);
					}
				}
			}
		]);
}

function fetchVersions(orgIds, packageOrgIds) {
	return new admin.AdminJob("refresh-versions", "Fetch package versions installed on orgs",
		[
			{
				name: "Fetching invalid production orgs",
				handler: (job) => orgpackageversions.fetchFromSubscribers(orgIds, packageOrgIds, job),
			}
		]);
}

exports.fetch = fetch;
exports.fetchInvalid = fetchInvalid;
exports.fetchVersions = fetchVersions;
