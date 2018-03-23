'use strict';

const sfdc = require('../api/sfdcconn');
const packageversions = require('../api/packageversions');
const upgrades = require('../api/upgrades');

async function createPushRequest(conn, packageVersionId, scheduledDate) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let body = {PackageVersionId: packageVersionId, ScheduledStartTime: isoTime};
    return conn.sobject("PackagePushRequest").create(body);
}

async function createPushJob(conn, packagePushRequestId, orgIds) {
    let body = [];
    for (let i = 0; i < orgIds.length; i++) {
        body.push({PackagePushRequestId: packagePushRequestId, SubscriberOrganizationKey: orgIds[i]});
    }
    return conn.sobject("PackagePushJob").create(body);
}

async function activateRequest(conn, packagePushRequestId) {
    return updatePushRequest(conn, packagePushRequestId, "Pending");
}

async function cancelRequests(conn) {
    let res = await conn.query("SELECT Id,PackageVersionId,Status,ScheduledStartTime FROM PackagePushRequest WHERE Status = 'Created'");
    console.log(`Canceling ${res.records.length} requests`);
    let canceled = res.records.map((v) => {
        return updatePushRequest(conn, v.Id, "Canceled");
    });
    res = await Promise.all(canceled);
    console.log('Canceled ' + JSON.stringify(res));
}

async function clearRequests(packageOrgIds) {
    for (let i = 0; i < packageOrgIds.length; i++) {
        let conn = await sfdc.buildOrgConnection(packageOrgIds[i]);
        await cancelRequests(conn);
    }
}

async function updatePushRequest(conn, packagePushRequestId, status) {
    return conn.sobject('PackagePushRequest').update({Id: packagePushRequestId, Status: status});
}

async function upgradeOrg(orgId, versionIds, scheduledDate) {
    let requests = [];
    let versions = await packageversions.findByIds(versionIds, orgId);
    for (let i = 0; i < versions.length; i++) {
        let version = versions[i];
        if (version.version_id === version.latest_version_id) {
            continue; // already up to date
        }
        let conn = await sfdc.buildOrgConnection(version.package_org_id);
        let pushreq = await createPushRequest(conn, version.version_id, scheduledDate);
        await createPushJob(conn, pushreq.id, [orgId]);

        // Activate right away, for now.  Later, this should be a done as a follow up manual step from the upgrade event screen.
        await activateRequest(conn, pushreq.id);

        requests.push(pushreq);
    }

    await upgrades.createUpgrade(scheduledDate);
    return requests;
}

async function upgradeVersion(versionId, orgIds, scheduledDate) {
    let version = await packageversions.findByIds([versionId])[0];
    let conn = await sfdc.buildOrgConnection(version.package_org_id);
    let pushreq = await createPushRequest(conn, version.version_id, scheduledDate);
    await createPushJob(conn, pushreq.id, orgIds);

    // Activate right away, for now.  Later, this should be a done as a follow up manual step from the upgrade event screen.
    await activateRequest(conn, pushreq.id);

    return pushreq;
}

async function findRequestsByIds(packageOrgId, requestIds) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let params = requestIds.map(v => `'${v}'`);
    let soql = `SELECT Id,PackageVersionId,Status,ScheduledStartTime 
        FROM PackagePushRequest 
        WHERE Id IN (${params.join(",")})`;

    let res = await conn.query(soql);
    return res.records;
}

async function findJobsByRequestIds(packageOrgId, requestIds) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let params = requestIds.map(v => `'${v}'`);
    let soql = `SELECT Id,PackagePushRequestId,Status,SubscriberOrganizationKey 
        FROM PackagePushJob
        WHERE PackagePushRequestId IN (${params.join(",")})`;

    let res = await conn.query(soql);
    return res.records;
}

exports.findRequestsByIds = findRequestsByIds;
exports.findJobsByRequestIds = findJobsByRequestIds;
exports.createPushRequest = createPushRequest;
exports.createPushJob = createPushJob;
exports.activateRequest = activateRequest;
exports.clearRequests = clearRequests;
exports.upgradeOrg = upgradeOrg;
exports.upgradeVersion = upgradeVersion;


// For fooling around
async function queryPackageVersions(packageOrgId) {
    try {
        let conn = await sfdc.buildOrgConnection(packageOrgId);
        let res = await conn.query("Select Id, Name, MetadataPackageId, ReleaseState, MajorVersion, MinorVersion, PatchVersion, BuildNumber " +
            " from MetadataPackageVersion" +
            " where MajorVersion = 208");
        let versions = res.records.map(function (v) {
            return v.Name + ': ' + v.MajorVersion + '.' + v.MinorVersion + '.' + v.PatchVersion + ' - ' + v.Id;
        }).join('\n');
        console.log(versions);
    } catch (e) {
        return console.error(e);
    }
}

const parseXML = require('xml2js').parseString;
const soap = require('../util/soap');

async function querySubscribers(conn, shortIds) {
    try {
        let idsIn = shortIds.map((v) => {
            return "'" + v + "'"
        }).join(",");
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

exports.queryPackageVersions = queryPackageVersions;
