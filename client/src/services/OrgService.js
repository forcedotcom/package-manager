import * as h from './h';

let url = "/api/orgs";

export let requestAll = sort => h.get(url, {sort_field: sort.field, sort_dir: sort.direction});

export let requestByPackage = (packageId, sort) => h.get(url, {packageId, sort_field: sort.field, sort_dir: sort.direction});

export let requestByPackageVersion = (packageVersionId, sort) => h.get(url, {packageVersionId, sort_field: sort.field, sort_dir: sort.direction});

export let requestById = id => h.get(url + "/" + id);

export let requestUpgrade = (id, versions, scheduled_date, description) => h.post(url + "/" + id + "/upgrade", {versions, scheduled_date, description});

export let requestAdd = (orgIds) => h.put(url, {orgIds});