'use strict';

const jsforce = require('jsforce');
const package_orgs = require('./package_orgs');

const PORT = process.env.PORT || 5000;

const LOGIN_URL = process.env.LOGIN_URL || 'https://steelbrick.my.salesforce.com';
const CALLBACK_URL = (process.env.LOCAL_URL || 'http://localhost:' + PORT) + '/oauth2/callback';

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;


function oauthLoginURL(req, res, next) {
    try {
        res.json(buildURL('api id web'));
    } catch (e) {
        next(e);
    }
}

function oauthOrgURL(req, res, next) {
    try {
        res.json(buildURL('api id web refresh_token'));
    } catch (e) {
        next(e);
    }
}

function buildURL(scope) {
    let conn = buildConnection();
    return conn.oauth2.getAuthorizationUrl({scope: scope} + "&prompt=login");
}

function oauthOrgCallback(req, res, next) {
    let conn = buildConnection();
    conn.authorize(req.query.code, function (err, userInfo) {
        if (err) {
            return next(err);
        }

        package_orgs.createPackageOrg(userInfo.organizationId, "", "", conn.instanceUrl, "", conn.refreshToken, conn.accessToken);
        console.log(JSON.stringify(userInfo));
        return res.send("<script>window.opener.location.reload(); window.close()</script>");
    });
}

function isAuth(req, res) {
    if (req.session.accessToken == null) {
        res.send('not authorized: <a href="/oauth2/auth">Just do it.</a>');
        return false;
    }
    return true;
}

function buildConnection(accessToken, refreshToken) {
    return new jsforce.Connection({
            oauth2: {
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                redirectUri: CALLBACK_URL
            },
            instanceUrl: LOGIN_URL,
            accessToken: accessToken,
            refreshToken: refreshToken
        }
    );
}

exports.oauthLoginURL = oauthLoginURL;
exports.oauthOrgURL = oauthOrgURL;
exports.oauthOrgCallback = oauthOrgCallback;
