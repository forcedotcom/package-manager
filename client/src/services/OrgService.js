import * as h from './h';

let url = "/api/orgs";

export let requestAll = () => h.get(url);

export let requestByPackage = packageId => h.get(url, {packageId});

export let requestByPackageVersion = versionId => h.get(url, {versionId});

export let requestById = id => h.get(url + "/" + id);

export let requestUpgrade = (id, versions, scheduled_date, description) => h.post(url + "/" + id + "/upgrade", {versions, scheduled_date, description});

export let requestAdd = (orgIds) => h.put(url, {orgIds});