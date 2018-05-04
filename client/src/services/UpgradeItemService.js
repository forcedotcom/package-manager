import * as h from './h';

let url = "/api/upgradeitems";

export let requestById = id => h.get(`${url}/${id}`);
export let activateById = id => h.post(`${url}/${id}/activate`);
export let cancelById = id => h.post(`${url}/${id}/cancel`);
export let findByUpgrade = (upgradeId, sort) => h.get(url, {upgradeId, sort_field: sort.field, sort_dir: sort.direction});
export let findByUpgradeWithStatus = (upgradeId, sort) => h.get(url, {fetchStatus: "true", upgradeId, sort_field: sort.field, sort_dir: sort.direction});
export let activateItems = (items) => h.post(url + "/activate", {items});
export let cancelItems = (items) => h.post(url + "/cancel", {items});
