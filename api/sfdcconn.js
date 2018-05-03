'use strict';

const jsforce = require('jsforce');
const packageorgs = require('./packageorgs');

const BT_ID = process.env.BT_ID || "00DU0000000KAFDMA4";
const BTSB_ID = process.env.BTSB_ID || "00Df0000001PStYEAW";

const ORG62_ID = process.env.ORG62_ID || "00D000000000062EAA";
const SB62_ID = process.env.SB62_ID || "00D300000008V7fEAE";
const PORT = process.env.PORT || 5000;

const CALLBACK_URL = (process.env.LOCAL_URL || 'http://localhost:' + PORT) + '/oauth2/callback';

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const INTERNAL_ID = '000000000000000';
const INVALID_ID = '000000000000001';

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
    let conn = buildConnection(packageOrg.access_token, packageOrg.refresh_token, packageOrg.instance_url);
    conn.on("refresh", async (accessToken, res) => {
        packageOrg.accessToken = accessToken;
        await packageorgs.updateAccessToken(packageOrgId, accessToken);
    });
    return conn;
}

exports.buildOrgConnection = buildOrgConnection;
exports.ORG62_ID = ORG62_ID;
exports.BT_ID = BT_ID;
exports.BTSB_ID = BTSB_ID;
exports.SB62_ID = SB62_ID;
exports.INTERNAL_ID = INTERNAL_ID;
exports.INVALID_ID = INVALID_ID;
