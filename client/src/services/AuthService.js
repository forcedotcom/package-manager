import * as h from './h';

let url = "/oauth2";

export let oauthLoginURL = (returnType, returnId) => h.get(url + "/loginurl", {returnType, returnId});

export let oauthOrgURL = (instanceUrl) => h.get(url + "/orgurl", {instanceUrl});

export let requestLogout = () => h.get(url + "/logout");

export let requestUser = () => h.get(url + "/user");