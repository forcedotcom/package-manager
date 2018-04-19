'use strict';

const jsforce = require('jsforce'),
    qs = require('query-string'),
    packageorgs = require('./packageorgs');

const PORT = process.env.PORT || 5000;
const LOCAL_URL = process.env.LOCAL_URL || 'http://localhost';

const CALLBACK_URL = `${LOCAL_URL}:${PORT}/oauth2/callback`;

const CLIENT_PORT = process.env.CLIENT_PORT || 3000;
const CLIENT_URL = `${LOCAL_URL}:${CLIENT_PORT}`;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const OAUTH_LOGIN_URL = process.env.OAUTH_LOGIN_URL || 'https://login.salesforce.com';

const AUTH_URL = process.env.LOGIN_URL || 'https://steelbrick.my.salesforce.com';

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
    return conn.oauth2.getAuthorizationUrl({scope: scope, prompt: 'login'});
}

async function oauthOrgCallback(req, res, next) {
    let conn = buildConnection();
    try {
        let userInfo = await conn.authorize(req.query.code);
        await packageorgs.initOrg(conn, userInfo.organizationId);
        res.redirect(`${CLIENT_URL}/authresponse`);
    } catch (e) {
        console.log(e);
        res.redirect(`${CLIENT_URL}/authresponse?${qs.stringify({message:e.message,severity:e.severity,code:e.code})}`);
    }
}

function isAuth(req) {
    return req.session.accessToken != null;
}

function buildConnection(accessToken, refreshToken) {
    return new jsforce.Connection({
            oauth2: {
                loginUrl: OAUTH_LOGIN_URL,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                redirectUri: CALLBACK_URL
            },
            instanceUrl: AUTH_URL,
            accessToken: accessToken,
            refreshToken: refreshToken
        }
    );
}

exports.oauthLoginURL = oauthLoginURL;
exports.oauthOrgURL = oauthOrgURL;
exports.oauthOrgCallback = oauthOrgCallback;
