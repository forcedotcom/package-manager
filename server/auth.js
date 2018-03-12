'use strict';

const jsforce = require('jsforce');
const packageorgs = require('./packageorgs');

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
    let url = conn.oauth2.getAuthorizationUrl({scope: scope}) + "&prompt=login";
    return url;
}

async function oauthOrgCallback(req, res, next) {
    let conn = buildConnection();
    try {
        let userInfo = await conn.authorize(req.query.code);
        let org = await conn.sobject("Organization").retrieve(userInfo.organizationId);
        await packageorgs.createPackageOrg(org.Id, org.Name, org.NamespacePrefix, org.InstanceName, conn.instanceUrl, conn.refreshToken, conn.accessToken);
        return res.redirect("/#/packageorgs");
    } catch (e) {
        return next(e);
    }
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
