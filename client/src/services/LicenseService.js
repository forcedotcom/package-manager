import * as h from './h';

let url = "/api/licenses";

export let requestAll = (sort_field, sort_dir, filters, page, pageSize) => h.get(url, {status: 'Active', sort_field, sort_dir,
	filters: filters ? JSON.stringify(filters) : null, page, pageSize});
export let requestById = id => h.get(url + "/" + id);