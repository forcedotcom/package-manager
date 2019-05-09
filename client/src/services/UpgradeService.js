import * as h from './h';

let url = "/api/upgrades";

export let requestAll = (sort_field, sort_dir) => h.get(url, {sort_field, sort_dir});
export let requestByGroup = (groupId, sort_field, sort_dir) => h.get(url, {groupId, sort_field, sort_dir});
export let requestById = id => h.get(`${url}/${id}`);
export let activate = id => h.post(`${url}/activate/${id}`);
export let cancel = id => h.post(`${url}/cancel/${id}`);
export let retry = id => h.post(`${url}/retry/${id}`);
export let purge = upgradeIds => h.post(url + "/purge", {upgradeIds});
export let refresh = id => h.post(`${url}/refresh/${id}`);

