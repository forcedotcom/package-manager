'use strict';

const jsforce = require('jsforce');
const qs = require('query-string');
const packageorgs = require('./packageorgs');

// Configurable parameters
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const LOCAL_URL = process.env.LOCAL_URL || 'http://localhost';
const PORT = process.env.PORT || 5000;
const CLIENT_PORT = process.env.CLIENT_PORT || PORT;
const API_URL = process.env.API_URL || `${LOCAL_URL}:${PORT}`;
const AUTH_URL = process.env.AUTH_URL || 'https://steelbrick.my.salesforce.com';

// Constants
const CLIENT_URL = `${LOCAL_URL}:${CLIENT_PORT}`;
const CALLBACK_URL = `${API_URL}/oauth2/callback`;
const PROD_LOGIN = "https://login.salesforce.com";
const TEST_LOGIN = "https://test.salesforce.com";

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
        const url = buildURL('api id web', {operation: "login", loginUrl: AUTH_URL, redirectTo: req.query.redirectTo});
        res.json(url);
    } catch (e) {
        next(e);
    }
}

function oauthOrgURL(req, res, next) {
    try {
        const url = buildURL("api id web refresh_token", {operation: "org", loginUrl: req.query.isSandbox ? TEST_LOGIN : PROD_LOGIN});
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
                res.redirect(`${CLIENT_URL}/authresponse?redirectTo=${state.redirectTo}`);
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

function buildConnection(accessToken, refreshToken, loginUrl = PROD_LOGIN) {
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
