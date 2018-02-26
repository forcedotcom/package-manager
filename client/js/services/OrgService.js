import * as h from './h';

let url = "/orgs";

export let requestAll = sort => h.get(url, {sort});

export let requestById = id => h.get(url + "/" + id);

export let requestUpgrade = (id, licenses, scheduled_date) => h.post(url + "/" + id + "/upgrade", {licenses, scheduled_date});