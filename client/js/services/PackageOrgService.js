import * as h from './h';

let url = "/packageorgs";

export let findAll = sort => h.get(url, {sort});

export let findById = id => h.get(url + "/" + id);

export let findByNamespace = namespace => h.get(url, {namespace});

export let updateItem = packageOrg => h.put(url, packageOrg);

export let createItem = packageOrg => h.post(url, packageOrg);

export let deleteItem = id => h.del(url + "/" + id);