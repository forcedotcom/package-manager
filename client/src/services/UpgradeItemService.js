import * as h from './h';

let url = "/api/upgradeitems";

export let requestById = (id, fetchStatus) => h.get(`${url}/${id}`, {fetchStatus});
export let findByUpgrade = (upgradeId, sort, fetchStatus) => h.get(url, {
	upgradeId,
	sort_field: sort.field,
	sort_dir: sort.direction,
	fetchStatus
});
export let activateItems = (items) => h.post(url + "/activate", {items});
export let cancelItems = (items) => h.post(url + "/cancel", {items});