import * as h from './h';

let url = "/api/admin";

export let fetch = (all) => h.get(url + "/fetch", {all});
export let fetchSubscribers = (all) => h.get(url + "/fetchsubscribers", {all});
export let fetchInvalid = () => h.get(url + "/fetchinvalid");