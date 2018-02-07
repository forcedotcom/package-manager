import * as h from './h';

let url = "/licenses";

export let findAll = sort => h.get(url, {sort});

export let findByAccount = account_id => h.get(url, {account_id});

export let findByStatus = status => h.get(url, {status});

export let findById = id => h.get(url + "/" + id);