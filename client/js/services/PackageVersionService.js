import * as h from './h';

let url = "/packageversions";

export let requestAll = sort => h.get(url, {sort});

export let findByPackage = packageId => h.get(url, {packageId});

export let findByDevOrgId = orgId => h.get(url, {orgId});

export let requestById = id => h.get(url + "/" + id);