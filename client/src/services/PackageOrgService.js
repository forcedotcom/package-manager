import * as h from './h';

let url = "/api/packageorgs";

export let requestAll = (sort_field, sort_dir) => h.get(url, {sort_field, sort_dir});

export let requestById = org_id => h.get(`${url}/${org_id}`);

export let requestUpdate = packageorg => h.post(url, {packageorg});

export let requestRefresh = orgIds => h.post(url + "/refresh", {orgIds});

export let requestRevoke = orgIds => h.post(url + "/revoke", {orgIds});

export let requestDelete = orgIds => h.post(url + "/delete", {orgIds});

export let requestActivation = (orgIds, flag) => h.post(url + "/activation", {orgIds, flag});
