import * as h from './h';

let url = "/api/upgrades";

export let requestAll = sort => h.get(url, {sort_field: sort.field, sort_dir: sort.direction});
export let requestById = id => h.get(url + "/" + id);