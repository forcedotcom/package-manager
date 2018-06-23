import * as h from './h';

let url = "/api/upgradejobs";

export let requestAllJobs = (itemId, sort, fetchStatus) => h.get(url, {itemId, sort_field: sort.field, sort_dir: sort.direction, fetchStatus});
export let requestAllJobsInUpgrade = (upgradeId, sort, fetchStatus) => h.get(url, {upgradeId, sort_field: sort.field, sort_dir: sort.direction, fetchStatus});

