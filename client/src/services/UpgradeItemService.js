import * as h from './h';

let url = "/api/upgradeitems";

export let requestById = (id) => h.get(`${url}/${id}`);
export let findByUpgrade = (upgradeId, sort_field, sort_dir) => h.get(url, {upgradeId, sort_field, sort_dir});
export let findByPackage = (packageId, sort_field, sort_dir) => h.get(url, {packageId, sort_field, sort_dir});
export let findByPackageOrg = (packageOrgId, sort_field, sort_dir) => h.get(url, {packageOrgId, sort_field, sort_dir});
export let activate = id => h.post(`${url}/activate/${id}`);
export let cancel = id => h.post(`${url}/cancel/${id}`);
export let refresh = id => h.post(`${url}/refresh/${id}`);