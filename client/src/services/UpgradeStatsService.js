import * as h from './h';

let url = "/api/stats";

export let requestStatsById = upgradeIds => h.post(url, {upgradeIds});
