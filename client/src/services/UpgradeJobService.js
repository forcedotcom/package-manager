import * as h from './h';

let url = "/api/upgradejobs";

export let requestAllJobs = (itemId, sort) => h.get(url, {itemId, sort_field: sort.field, sort_dir: sort.direction});

export let requestAllJobsInUpgrade = (upgradeId, sort) => h.get(url, {upgradeId, sort_field: sort.field, sort_dir: sort.direction});

