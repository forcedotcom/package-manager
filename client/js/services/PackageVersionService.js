import * as h from './h';

let url = "/packageversions";

export let findAll = sort => h.get(url, {sort});

export let findByPackage = packageId => h.get(url, {packageId});

export let findById = id => h.get(url + "/" + id);