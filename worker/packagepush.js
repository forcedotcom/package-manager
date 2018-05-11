'use strict';

const sfdc = require('../api/sfdcconn');
const packageversions = require('../api/packageversions');
const upgrades = require('../api/upgrades');
const logger = require('../util/logger').logger;

const Status = {Created: "Created", Pending: "Pending", InProgress: "InProgress", Succeeded: "Succeeded", Failed: "Failed", Canceled: "Canceled"};

async function createPushRequest(conn, upgradeId, packageOrgId, packageVersionId, scheduledDate, createdBy) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let body = {PackageVersionId: packageVersionId, ScheduledStartTime: isoTime};
    let pushReq = await conn.sobject("PackagePushRequest").create(body);
    return await upgrades.createUpgradeItem(upgradeId, pushReq.id, packageOrgId, packageVersionId, scheduledDate, pushReq.success ? Status.Created : pushReq.errors, createdBy);
}

async function createPushJob(conn, upgradeId, itemId, pushReqId, orgIds) {
    let body = [];
    for (let i = 0; i < orgIds.length; i++) {
        body.push({PackagePushRequestId: pushReqId, SubscriberOrganizationKey: orgIds[i]});
    }

    let results = await conn.sobject("PackagePushJob").create(body);
    
    let jobs = [];
    for (let i = 0; i < results.length; i++) {
        jobs.push({org_id: orgIds[i], job_id: results[i].id, status: results[i].success ? Status.Created : results[i].errors});
    }

    await upgrades.createUpgradeJobs(upgradeId, itemId, pushReqId, jobs);
}

async function cancelRequests(conn) {
    let res = await conn.query(`SELECT Id,PackageVersionId,Status,ScheduledStartTime FROM PackagePushRequest WHERE Status = '${Status.Created}'`);
    logger.info(`Canceling push upgrade requests`, {count: res.records.length});
    let canceled = res.records.map((v) => {
        return conn.sobject('PackagePushRequest').update({Id: v.Id, Status: Status.Canceled});
    });
    res = await Promise.all(canceled);
    logger.info(`Canceled push upgrade requests`, {count: res.records.length});
}

async function clearRequests(packageOrgIds) {
    for (let i = 0; i < packageOrgIds.length; i++) {
        let conn = await sfdc.buildOrgConnection(packageOrgIds[i]);
        await cancelRequests(conn);
    }
}

async function updatePushRequests(upgradeItemIds, status, currentUser) {
    let conns = {}, batches = {};

    let items = await upgrades.findItemsByIds(upgradeItemIds);
    for (let i = 0; i < items.length; i++) {
        let item = items[i];
        if (status === Status.Pending && process.env.ENFORCE_ACTIVATION_POLICY !== "false") {
            if (item.created_by === null) {
                throw new Error(`Cannot activate upgrade item ${item.id} without knowing who created it`);
            }
            if (item.created_by === currentUser) {
                throw new Error(`Cannot activate upgrade item ${item.id} by the same user ${currentUser} who created it`);
            }
        }
        let conn = conns[item.package_org_id] = conns[item.package_org_id] || await sfdc.buildOrgConnection(item.package_org_id);
        let batch = batches[item.push_request_id] = (batches[item.push_request_id] || {conn: conn, requests: []});
        batch.requests.push({Id: item.push_request_id, Status: status});
    }

    // Now, just update requests.
    let promises = [];
    Object.entries(batches).forEach(([key, batch]) => {
        promises.push(batch.conn.sobject('PackagePushRequest').update(batch.requests));
    });
    return await Promise.all(promises);
}

async function upgradeOrgs(orgIds, versionIds, scheduledDate, createdBy, description) {
    let upgrade = await upgrades.createUpgrade(scheduledDate, createdBy, description);

    let versions = await packageversions.findLatestByOrgIds(versionIds, orgIds);
    for (let i = 0; i < versions.length; i++) {
        let version = versions[i];
        let conn = await sfdc.buildOrgConnection(version.package_org_id);
        let item = await createPushRequest(conn, upgrade.id, version.package_org_id, version.latest_version_id, scheduledDate, createdBy);
        await createPushJob(conn, upgrade.id, item.id, item.push_request_id, orgIds);
    }
    return upgrade;
}

async function upgradeOrgGroups(orgGroupIds, versionIds, scheduledDate, createdBy, description) {
    let conns = {}, pushReqs = {};

    let upgrade = await upgrades.createUpgrade(scheduledDate, createdBy, description);

    let versions = await packageversions.findLatestByGroupIds(versionIds, orgGroupIds);
    for (let i = 0; i < versions.length; i++) {
        let version = versions[i];
        let orgKey = version.package_org_id, reqKey = version.package_org_id + version.latest_version_id;

        let conn = conns[orgKey] = conns[orgKey] || await sfdc.buildOrgConnection(version.package_org_id);

        let pushReq = pushReqs[reqKey] = pushReqs[reqKey] || // Initialized if not found
            {item: await createPushRequest(conn, upgrade.id, version.package_org_id, version.latest_version_id, scheduledDate, createdBy), conn: conn, orgIds: []};

        // Add this particular org id to the batch
        pushReq.orgIds.push(version.org_id);
    }

    // Now, create the jobs 
    Object.entries(pushReqs).forEach(async ([key, pushReq]) => {
        await createPushJob(pushReq.conn, upgrade.id, pushReq.item.id, pushReq.item.push_request_id, pushReq.orgIds);
    });

    return upgrade;
}

async function upgradeVersion(versionId, orgIds, scheduledDate, createdBy, description) {
    let version = await packageversions.findLatestByOrgIds([versionId], orgIds)[0];
    let conn = await sfdc.buildOrgConnection(version.package_org_id);

    let upgrade = await upgrades.createUpgrade(scheduledDate, createdBy, description);

    let item = await createPushRequest(conn, upgrade.id, version.package_org_id, version.latest_version_id, scheduledDate, createdBy);
    await createPushJob(conn, upgrade.id, item.id, item.push_request_id, orgIds);

    return upgrade;
}

async function findRequestsByStatus(packageOrgId, status) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let soql = `SELECT Id,PackageVersionId,Status,ScheduledStartTime 
        FROM PackagePushRequest 
        WHERE Status IN (${status.map(v => `'${v}'`).join(",")})`;

    let res = await conn.query(soql);
    return res.records;
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

async function findJobsByStatus(packageOrgId, requestIds, status) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let soql = `SELECT Id,PackagePushRequestId,Status,SubscriberOrganizationKey 
        FROM PackagePushJob
        WHERE PackagePushRequestId IN (${status.map(v => `'${v}'`).join(",")})
        AND Status IN (${status.map(v => `'${v}'`).join(",")})`;

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

async function findErrorsByJobIds(packageOrgId, jobIds) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let params = jobIds.map(v => `'${v}'`);
    let soql = `SELECT Id,ErrorDetails,ErrorMessage,ErrorSeverity,ErrorTitle,ErrorType,PackagePushJobId 
        FROM PackagePushError
        WHERE PackagePushJobId IN (${params.join(",")})`;

    let res = await conn.query(soql);
    return res.records;
}

exports.findRequestsByStatus = findRequestsByStatus;
exports.findRequestsByIds = findRequestsByIds;
exports.findJobsByStatus = findJobsByStatus;
exports.findJobsByRequestIds = findJobsByRequestIds;
exports.findErrorsByJobIds = findErrorsByJobIds;
exports.updatePushRequests = updatePushRequests;
exports.clearRequests = clearRequests;
exports.upgradeOrgs = upgradeOrgs;
exports.upgradeOrgGroups = upgradeOrgGroups;
exports.upgradeVersion = upgradeVersion;
exports.Status = Status;