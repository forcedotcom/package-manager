'use strict';

const jsforce = require('jsforce');
const packageorgs = require('./packageorgs');

const NamedOrgs = process.env.NAMED_ORGS ? JSON.parse(process.env.NAMED_ORGS) : {
    bt: {orgId: "00DA0000000gYotMAE", name: "BT2 Black Tab", instanceUrl: "https://bt2.my.salesforce.com"},
    sbt: {orgId: "00DJ00000001ECoMAM", name: "SBT2 Black Tab", instanceUrl: "https://sbt2.cs10.my.salesforce.com"},
    org62: {orgId: "00D000000000062EAA", name: "Org 62", instanceUrl: "https://org62.my.salesforce.com"},
    sb62: {orgId: "00D300000008V7fEAE", name: "SB 62", instanceUrl: "https://steelbrick.my.salesforce.com"}
};

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
    if (!packageOrg) {
        throw new Error(`No such package org with id ${packageOrgId}`);
    }
    if (!packageOrg.refresh_token) {
        throw new Error(`Package Org ${packageOrgId} cannot be refreshed without a prior connection.`);
    }
    let conn = buildConnection(packageOrg.access_token, packageOrg.refresh_token, packageOrg.instance_url);
    conn.on("refresh", async (accessToken, res) => {
        packageOrg.accessToken = accessToken;
        await packageorgs.updateAccessToken(packageOrgId, accessToken);
    });
    return conn;
}

exports.buildOrgConnection = buildOrgConnection;
exports.INTERNAL_ID = INTERNAL_ID;
exports.INVALID_ID = INVALID_ID;
exports.NamedOrgs = NamedOrgs;