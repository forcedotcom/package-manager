import * as h from './h';

let url = "/oauth2";

export let oauthLoginURL = (returnTo) => h.get(url + "/loginurl", {returnTo});

export let oauthOrgURL = (instanceUrl, type) => h.get(url + "/orgurl", {instanceUrl, type});

export let requestLogout = () => h.get(url + "/logout");

export let requestUser = () => h.get(url + "/user");