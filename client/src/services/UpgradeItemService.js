import * as h from './h';

let url = "/api/upgradeitems";

export let requestById = (id, fetchStatus) => h.get(`${url}/${id}`, {fetchStatus});
export let findByUpgrade = (upgradeId, sort, fetchStatus) => h.get(url, {upgradeId, sort_field: sort.field, sort_dir: sort.direction, fetchStatus});
export let activate = id => h.post(`${url}/activate/${id}`);
export let cancel = id => h.post(`${url}/cancel/${id}`);