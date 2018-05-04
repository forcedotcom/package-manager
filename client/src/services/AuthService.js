import * as h from './h';

let url = "/oauth2";

export let oauthLoginURL = redirectTo => h.get(url + "/loginurl", {redirectTo});

export let oauthOrgURL = isSandbox => h.get(url + "/orgurl", {isSandbox});

export let requestLogout = () => h.get(url + "/logout");