'use strict';

const jsforce = require('jsforce');
const soap = require('./soap');
const parseXML = require('xml2js').parseString;

const packageorgs = require('./packageorgs');

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
    let packageOrg = await packageorgs.retrieveById(packageOrgId);
    return buildConnection(packageOrg.access_token, packageOrg.refresh_token);
}

async function createPushRequest(conn, packageVersionId) {
    let body = {PackageVersionId: packageVersionId}; // ScheduledStartTime
    let res = await conn.sobject("PackagePushRequest").create(body);
    console.log('Result', JSON.stringify(soap.getResponseBody(res)));
}

async function createPushJob(conn, packageVersionId) {
    try {
        let body = {PackageVersionId: packageVersionId};
        let res = await conn.sobject("PackagePushJob").create(body);
        console.log('Result', JSON.stringify(soap.getResponseBody(res)));
    } catch (e) {
        console.error(e);
    }
}

async function clearRequests(conn) {
    let res;
    try {
        res = await conn.query("SELECT Id,PackageVersionId,Status,ScheduledStartTime FROM PackagePushRequest");
        console.log(JSON.stringify(res.records));
        // await conn.tooling.sobject('PackagePushRequest').delete(ids);
    } catch (e) {
        console.error(e);
    }
}

async function queryPackageVersions(packageOrgId) {
    try {
        let conn = await buildOrgConnection(packageOrgId);
        let res = await conn.query("Select Id, Name, MetadataPackageId, ReleaseState, MajorVersion, MinorVersion, PatchVersion, BuildNumber " +
            " from MetadataPackageVersion" +
            " where MajorVersion = 208");
        let versions = res.records.map(function(v) { return v.Name + ': ' + v.MajorVersion + '.' + v.MinorVersion + '.' + v.PatchVersion + ' - ' + v.Id;}).join('\n');
        console.log(versions);
    } catch (e) {
        return console.error(e);
    }
}

async function querySubscribers(packageOrgId, shortIds) {
    try {
        let conn = await buildOrgConnection(packageOrgId);
        let idsIn = shortIds.map((v) => {return "'" + v + "'"}).join(",");
        let soql = "SELECT Id, OrgName, InstalledStatus, InstanceName, OrgStatus, OrgType, MetadataPackageVersionId, OrgKey FROM PackageSubscriber WHERE OrgKey IN (" + idsIn + ")";
        let res = await soap.invoke(conn, "query", {queryString: soql});
        console.log(JSON.stringify(soap.getResponseBody(res).result.records));
    } catch (e) {
        parseXML(e.message, function (err, result) {
            let error = soap.parseError(result);
            console.error(error.message);
        });
    }
}

exports.createPushRequest = createPushRequest;
exports.createPushJob = createPushJob;
exports.clearRequests = clearRequests;

// boo
exports.querySubscribers = querySubscribers;
exports.queryPackageVersions = queryPackageVersions;
