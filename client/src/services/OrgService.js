import * as h from './h';

let url = "/api/orgs";

export let requestAll = (blacklisted) => h.get(url, {blacklisted});

export let requestByPackage = (packageId, blacklisted) => h.get(url, {packageId, blacklisted});

export let requestByPackageVersion = (versionId, blacklisted) => h.get(url, {versionId, blacklisted});

export let requestByRelatedOrg = relatedOrgId => h.get(url, {relatedOrgId});

export let requestByUpgradeBlacklist = blacklistUpgradeId => h.get(url, {blacklistUpgradeId});

export let requestById = id => h.get(url + "/" + id);

export let requestUpgrade = (id, versions, scheduled_date, description, transid) => h.post(url + "/" + id + "/upgrade", {versions, scheduled_date, description, transid});

export let requestAdd = (orgIds, transid) => h.put(url, {orgIds, transid});