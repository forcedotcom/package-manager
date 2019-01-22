import * as h from './h';

let url = "/api/search";

export let requestByTerm = (term) => h.get(url, {term});