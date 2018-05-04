import * as h from './h';

let url = "/api/upgradejobs";

export let findByUpgradeItem = (itemId, sort) => h.get(url, {itemId, sort_field: sort.field, sort_dir: sort.direction});
export let fetchJobStatusByItem = (itemId) => h.get(`${url}/${itemId}/status`);

