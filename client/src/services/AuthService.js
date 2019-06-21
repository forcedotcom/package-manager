import * as h from './h';

let url = "/oauth2";

export let oauthLoginURL = (returnTo) => h.get(url + "/loginurl", {returnTo});

export let oauthOrgURL = (instanceUrl, type, returnTo) => h.get(url + "/orgurl", {instanceUrl, type, returnTo});

export let requestLogout = () => h.get(url + "/logout");

export let requestUser = () => h.get(url + "/user").then(user => {
    sessionStorage.setItem("user", JSON.stringify(user));
    return user;
});

export let getSessionUser = () => {
    let str = sessionStorage.getItem("user");
    let user = JSON.parse(str);
    return user;
};

export let invalidateUser = () => sessionStorage.removeItem('user');
