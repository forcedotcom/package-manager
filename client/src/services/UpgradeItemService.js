import * as h from './h';

let url = "/api/upgradeitems";

export let requestById = (id) => h.get(`${url}/${id}`);
export let findByUpgrade = (upgradeId, sort) => h.get(url, {upgradeId, sort_field: sort.field, sort_dir: sort.direction});
export let activate = id => h.post(`${url}/activate/${id}`);
export let cancel = id => h.post(`${url}/cancel/${id}`);