import * as h from './h';

let url = "/api/packageorgs";

export let requestAll = sort => h.get(url, {sort_field: sort.field, sort_dir: sort.direction});

export let requestById = org_id => h.get(`${url}/${org_id}`);

export let requestRefresh = orgIds => h.post(url + "/refresh", {orgIds});

export let requestDelete = orgIds => h.post(url + "/delete", {orgIds});
