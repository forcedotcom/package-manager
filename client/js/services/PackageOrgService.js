import * as h from './h';

let url = "/packageorgs";

export let requestAll = sort => h.get(url, {sort});

export let requestById = id => h.get(url + "/" + id);

export let requestByNamespace = namespace => h.get(url, {namespace});

export let requestDeleteById = id => h.del(url + "/" + id);