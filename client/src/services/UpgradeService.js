import * as h from './h';

let url = "/api/upgrades";

export let requestAll = sort => h.get(url, {sort_field: sort.field, sort_dir: sort.direction});
export let requestById = id => h.get(`${url}/${id}`);
export let activate = id => h.post(`${url}/activate/${id}`);
export let cancel = id => h.post(`${url}/cancel/${id}`);
export let retry = id => h.post(`${url}/retry/${id}`);
