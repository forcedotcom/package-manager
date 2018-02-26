import * as h from './h';

let url = "/licenses";

export let requestAll = sort => h.get(url, {sort});

export let findByAccount = account_id => h.get(url, {account_id});

export let findByOrgId = org_id => h.get(url, {org_id});

export let requestById = id => h.get(url + "/" + id);