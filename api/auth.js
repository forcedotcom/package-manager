'use strict';

const jsforce = require('jsforce');
const qs = require('query-string');
const packageorgs = require('./packageorgs');
const sfdc = require('./sfdcconn');

const PORT = process.env.PORT || 5000;
const LOCAL_URL = process.env.LOCAL_URL || 'http://localhost';

const CALLBACK_URL = `${LOCAL_URL}:${PORT}/oauth2/callback`;

const CLIENT_PORT = process.env.CLIENT_PORT || 3000;
const CLIENT_URL = `${LOCAL_URL}:${CLIENT_PORT}`;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const OAUTH_LOGIN_URL = process.env.OAUTH_LOGIN_URL || 'https://login.salesforce.com';

const AUTH_URL = process.env.LOGIN_URL || 'https://steelbrick.my.salesforce.com';

function requestLogout(req, res, next) {
    try {
        req.session = null;
        return res.send({result: 'ok'});
    } catch (e) {
        next(e);
    }
}

function oauthLoginURL(req, res, next) {
    try {
        const url = buildURL('api id web', {operation: "login", loginUrl: "https://steelbrick.my.salesforce.com", redirectTo: req.query.redirectTo});
        res.json(url);
    } catch (e) {
        next(e);
    }
}

function oauthOrgURL(req, res, next) {
    try {
        const url = buildURL("api id web refresh_token", {operation: "org", loginUrl: req.query.isSandbox ? "https://test.salesforce.com" : "https://login.salesforce.com"});
        res.json(url);
    } catch (e) {
        next(e);
    }
}

function buildURL(scope, state) {
    let conn = buildConnection(undefined, undefined, state.loginUrl);
    return conn.oauth2.getAuthorizationUrl({scope: scope, prompt: 'login', state: JSON.stringify(state)});
}

async function oauthCallback(req, res, next) {
    let state = JSON.parse(req.query.state);
    let conn = buildConnection(null, null, state.loginUrl);
    try {
        let userInfo = await conn.authorize(req.query.code);
        switch (state.operation) {
            case "org":
                await packageorgs.initOrg(conn, userInfo.organizationId);
                res.redirect(`${CLIENT_URL}/authresponse`);
                break;
            default:
                req.session.access_token = conn.accessToken;
                res.redirect(`${CLIENT_URL}/authresponse?redirect=${state.redirectTo}`);
        }
    } catch (e) {
        console.error(e);
        let errs = {
            message: e.message,
            severity: e.severity,
            code: e.code
        };

        res.redirect(`${CLIENT_URL}/authresponse?${qs.stringify(errs)}`);
    }
}

function buildConnection(accessToken, refreshToken, loginUrl = OAUTH_LOGIN_URL) {
    return new jsforce.Connection({
            oauth2: {
                loginUrl: loginUrl,
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

exports.requestLogout = requestLogout;
exports.oauthLoginURL = oauthLoginURL;
exports.oauthOrgURL = oauthOrgURL;
exports.oauthCallback = oauthCallback;
