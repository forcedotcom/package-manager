import * as h from './h';

let url = "/orgs";

export let findAll = sort => h.get(url, {sort});

export let findById = id => h.get(url + "/" + id);