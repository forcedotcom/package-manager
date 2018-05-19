import * as h from './h';

let url = "/api/admin";

export let fetch = (all) => h.get(url + "/fetch", {all});
export let fetchInvalid = () => h.get(url + "/fetchinvalid");