import * as h from './h';

let url = "/api/licenses";

export let requestAll = sort => h.get(url, {status: 'Active', sort_field: sort.field, sort_dir: sort.direction});

export let requestById = id => h.get(url + "/" + id);