import * as h from './h';

let url = "/api/admin";

export let fetch = () => h.get(url + "/fetch", {});