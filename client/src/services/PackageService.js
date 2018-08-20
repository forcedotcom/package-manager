import * as h from './h';

let url = "/api/packages";

export let requestAll = (sort_field, sort_dir) => h.get(url, {sort_field, sort_dir});
export let requestById = id => h.get(url + "/" + id);