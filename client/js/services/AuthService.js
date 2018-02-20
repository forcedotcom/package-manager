import * as h from './h';

let baseurl = "/oauth2";

exports.oauthLoginURL = oauthLoginURL;
exports.oauthOrgURL = oauthOrgURL;
exports.oauthCallback = oauthCallback;

export let oauthLoginURL = () => h.get(baseurl + "/loginurl");

export let oauthOrgURL = () => h.get(baseurl + "/orgurl");

export let oauthCallback = code => h.get(baseurl + "/callback", {code});