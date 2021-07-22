import * as h from './h';

let url = "/api/stats";

export let requestAll = (sort_field, sort_dir, filters, page, pageSize) => h.get(url, {sort_field, sort_dir,
	filters: filters ? JSON.stringify(filters) : null, page, pageSize});