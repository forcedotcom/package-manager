import * as h from './h';

let url = "/api/packageversions";

export let requestAll = sort => h.get(url, {sort});

export let findByPackage = (packageId, sort) => h.get(url, {packageId, sort_field: sort.field, sort_dir: sort.direction});

export let findByPackageOrgId = (packageOrgId, sort) => h.get(url, {packageOrgId, sort_field: sort.field, sort_dir: sort.direction});

export let findByLicensedOrgId = licensedOrgId => h.get(url, {licensedOrgId, status: 'All'});

export let findByOrgGroupId = (orgGroupId, sort) => h.get(url, {orgGroupId, sort_field: sort.field, sort_dir: sort.direction});

export let requestById = id => h.get(url + "/" + id);