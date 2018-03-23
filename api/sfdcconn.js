'use strict';

const jsforce = require('jsforce');
const packageorgs = require('./packageorgs');

const ORG62_ID = "00D000000000062EAA";
const SB62_ID = "00D300000008V7fEAE";
const PORT = process.env.PORT || 5000;

const CALLBACK_URL = (process.env.LOCAL_URL || 'http://localhost:' + PORT) + '/oauth2/callback';

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;


function buildConnection(accessToken, refreshToken, instanceUrl) {
    return new jsforce.Connection({
            oauth2: {
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                redirectUri: CALLBACK_URL
            },
            instanceUrl: instanceUrl,
            accessToken: accessToken,
            refreshToken: refreshToken
        }
    );
}

async function buildOrgConnection(packageOrgId) {
    let packageOrg = await packageorgs.retrieveByOrgId(packageOrgId);
    return buildConnection(packageOrg.access_token, packageOrg.refresh_token, packageOrg.instance_url);
}

exports.buildOrgConnection = buildOrgConnection;
exports.ORG62_ID = ORG62_ID;
exports.SB62_ID = SB62_ID;
