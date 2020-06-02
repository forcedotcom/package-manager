import * as h from './h';

let url = "/api/stats";

export let requestStatsByid = upgradeIds => h.post(url, {upgradeIds});
