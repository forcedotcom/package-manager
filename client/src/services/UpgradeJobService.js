import * as h from './h';

let url = "/api/upgradejobs";

export let requestAllJobs = (itemId, sort_field, sort_dir) => h.get(url, {itemId, sort_field, sort_dir});

export let requestAllJobsInUpgrade = (upgradeId, sort_field, sort_dir) => h.get(url, {upgradeId, sort_field, sort_dir});

