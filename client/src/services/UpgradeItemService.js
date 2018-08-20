import * as h from './h';

let url = "/api/upgradeitems";

export let requestById = (id) => h.get(`${url}/${id}`);
export let findByUpgrade = (upgradeId, sort_field, sort_dir) => h.get(url, {upgradeId, sort_field, sort_dir});
export let activate = id => h.post(`${url}/activate/${id}`);
export let cancel = id => h.post(`${url}/cancel/${id}`);