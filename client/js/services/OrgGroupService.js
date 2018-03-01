import * as h from './h';

let url = "/orggroups";

export let requestAll = sort => h.get(url, {sort});

export let requestById = id => h.get(url + "/" + id);

export let requestMembers = id => h.get(url + "/" + id + "/members");

export let requestUpdate = orggroup => h.put(url, orggroup);

export let requestCreate = orggroup => h.post(url, orggroup);

export let requestDelete = id => h.del(url + "/" + id);

