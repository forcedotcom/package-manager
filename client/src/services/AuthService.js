import * as h from './h';

let url = "/oauth2";

export let oauthLoginURL = (returnTo) => h.get(url + "/loginurl", {returnTo});

export let oauthOrgURL = (instanceUrl, type, returnTo) => h.get(url + "/orgurl", {instanceUrl, type, returnTo});

export let exportOrgURL = (instanceUrl, type, returnTo) => h.get(url + "/exportorgurl", {instanceUrl, type, returnTo});

export let requestLogout = () => h.get(url + "/logout");

export let requestUser = () => h.get(url + "/user").then(user => {
    sessionStorage.setItem("user", JSON.stringify(user));
    return user;
});

export let getSessionUser = (dis) => {
    let str = sessionStorage.getItem("user");
    let user = JSON.parse(str);
    if (!user) {
        user = {read_only: true};
        requestUser().then(user => {
            dis.setState({user});
        }).catch(e => dis.setState({user: {display_name: "Invalid", username: e.message}}));
    }

    return user;
};

export let invalidateUser = () => sessionStorage.removeItem('user');
