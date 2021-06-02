const ps = require('./packagefetch');
const pvs = require('./packageversionfetch');
const licenses = require('./licensefetch');
const orgs = require('./orgfetch');
const accounts = require('./accountfetch');
const org62accounts = require('./org62fetch');
const sfdc = require('../api/sfdcconn');
const admin = require('../api/admin');

const subs = require('./subscriberfetch');

const packageorgs = require('../api/packageorgs');

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
							return licenses.fetch((await sfdc.getKnownOrg(sfdc.OrgTypes.Licenses)).orgId, fetchAll, job);
						}
					},
				],
				fail: async (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus((await sfdc.getKnownOrg(sfdc.OrgTypes.Licenses)).orgId, packageorgs.Status.Invalid)
							.then(() => {
						});
					}
				}
			},
			{
				name: "Populating package data",
				steps: [
					{
						name: "Fetching packages",
						handler: async (job) => ps.fetch((await sfdc.getKnownOrg(sfdc.OrgTypes.Licenses)).orgId, fetchAll, job)
					},
					{
						name: "Fetching package versions",
						handler: async (job) => pvs.fetch((await sfdc.getKnownOrg(sfdc.OrgTypes.Licenses)).orgId, fetchAll, job)
					},
					{
						name: "Fetching latest package versions",
						handler: (job) => pvs.fetchLatest(job)
					}
				],
				fail: async (e) => {
					if (e.name === "invalid_grant") {
						packageorgs.updateOrgStatus((await sfdc.getKnownOrg(sfdc.OrgTypes.Licenses)).orgId, packageorgs.Status.Invalid)
							.then(() => {});
					}
				}
			},
			{
				name: "Fetch orgs",
				steps: [
					{
						name: "Updating orgs location",
						handler: (job) => orgs.updateOrgLocation(job)
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
