const ps = require('./packagefetch');
const pvs = require('./packageversionfetch');
const licenses = require('./licensefetch');
const orgs = require('./orgfetch');
const accounts = require('./accountfetch');
const instances = require('./instancefetch');
const admin = require('../api/admin');

const subs = require('./subscriberfetch');

/**
 * a. lma => licenses.  is for fun.
 * b. package org: package, versions, subscribers => org and org package versions.
 * c. accounts org: fetch account id and name based on org id.  Internal? org62.  External? licenses.
 * d. orgs: populate account id on sandbox orgs using parent relationship.
 * i: allow editing package version to exclude outdated versions.
 *
 * 1. For each packaging org, fetch all subscriber orgs, including ParentOrg linking sandboxes to prod parent
 * 2. Query org62 for all accounts by org ids.
 * 3. Fill in account ids on sandbox org records using data from parent production org.
 */
function fetchData(fetchAll) {
	return new admin.AdminJob(
		admin.JobTypes.FETCH,
		fetchAll ? "Fetch all data" : "Fetch latest data",
		[
			{
				name: "Populating license data",
				steps: [
					{
						name: "Fetching licenses",
						handler: async (job) => {
							return licenses.fetch(fetchAll, job);
						}
					},
				]
			},
			{
				name: "Populating package data",
				steps: [
					{
						name: "Fetching packages",
						handler: async (job) => ps.fetch(fetchAll, job)
					},
					{
						name: "Fetching package versions",
						handler: async (job) => pvs.fetch(fetchAll, job)
					},
					{
						name: "Fetching latest package versions",
						handler: (job) => pvs.fetchLatest(job)
					}
				]
			},
			{
				name: "Fetch orgs",
				steps: [
					{
						name: "Fetching package subscribers",
						handler: (job) => subs.fetch(fetchAll, job)
					},
					{
						name: "Fetching accounts for orgs",
						handler: async  (job) => {
							return accounts.fetch(fetchAll, job)
						}
					},
					{
						name: "Updating orgs based on license status",
						handler: (job) => orgs.updateOrgStatus(job)
					},
					{
						name: "Updating orgs from accounts",
						handler: (job) => orgs.updateOrgsFromAccounts(job)
					},
					{
						name: "Updating sandbox orgs from parents",
						handler: (job) => orgs.updateChildrenFromParents(job)
					},
					{
						name: "Fetching instances",
						handler: (job) => instances.updateInstances(job)
					}
				]
			}
		]);
}

function fetchOrgVersions(orgId) {
	const orgIds = Array.isArray(orgId) ? orgId : [orgId];
	return new admin.AdminJob(admin.JobTypes.REFRESH_VERSIONS, "Fetch package versions for orgs",
		[
			{
				name: "Fetching package versions for org",
				handler: (job) => subs.fetchByOrgIds(orgIds, job),
			},
			{
				name: "Finish event",
				handler: () => 	admin.emit(admin.Events.ORG_VERSIONS, orgId)
			}
		]);
}

function fetchOrgGroupVersions(groupId) {
	return new admin.AdminJob(admin.JobTypes.REFRESH_VERSIONS, "Fetch package versions for a group",
		[
			{
				name: "Fetching package versions for group",
				handler: (job) => subs.fetchByOrgGroupId(groupId, job),
			},
			{
				name: "Finish event",
				handler: () => 	admin.emit(admin.Events.GROUP_VERSIONS, groupId)
			}
		]);
}

exports.fetchData = fetchData;
exports.fetchOrgVersions = fetchOrgVersions;
exports.fetchOrgGroupVersions = fetchOrgGroupVersions;
