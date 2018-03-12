'use strict';

const jsforce = require('jsforce');
const packageorgs = require('./packageorgs');

const ORG62_ID = "00D000000000062EAA";
const PORT = process.env.PORT || 5000;

const LOGIN_URL = process.env.LOGIN_URL || 'https://steelbrick.my.salesforce.com';
const CALLBACK_URL = (process.env.LOCAL_URL || 'http://localhost:' + PORT) + '/oauth2/callback';

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;


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

async function buildOrgConnection(packageOrgId) {
    let packageOrg = await packageorgs.retrieveByOrgId(packageOrgId);
    return buildConnection(packageOrg.access_token, packageOrg.refresh_token);
}

exports.buildConnection = buildConnection;
exports.buildOrgConnection = buildOrgConnection;
exports.ORG62_ID = ORG62_ID;
