'use strict';

const sfdc = require('../api/sfdcconn');
const packageversions = require('../api/packageversions');
const upgrades = require('../api/upgrades');
const logger = require('../util/logger').logger;

const Status = {Created: "Created", Pending: "Pending", InProgress: "InProgress", Succeeded: "Succeeded", Failed: "Failed", Canceled: "Canceled", Ineligible: "Ineligible"};

async function createPushRequest(conn, upgradeId, packageOrgId, packageVersionId, scheduledDate, createdBy) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let body = {PackageVersionId: packageVersionId, ScheduledStartTime: isoTime};
    let pushReq = await conn.sobject("PackagePushRequest").create(body);
    let item = await upgrades.createUpgradeItem(upgradeId, pushReq.id, packageOrgId, packageVersionId, scheduledDate, pushReq.success ? Status.Created : pushReq.errors, createdBy);
    return item;
}

async function createPushJob(conn, upgradeId, itemId, pushReqId, orgIds) {
    let pushJobs = [];
    for (let i = 0; i < orgIds.length; i++) {
        pushJobs.push({PackagePushRequestId: pushReqId, SubscriberOrganizationKey: orgIds[i]});
    }

    // Create job and batch, and execute it
    let job = conn.bulk.createJob("PackagePushJob", "insert");
    let batch = job.createBatch();
    batch.execute(pushJobs);
    
    // listen for events
    batch.on("error", function (batchInfo) { // fired when batch request is queued in server.
        logger.error('Failed to batch load PushUpgradeJob records', {...batchInfo});
    });
    batch.on("queue", function (batchInfo) { // fired when batch request is queued in server.
        logger.debug('Queued batch of PushUpgradeJob records', {...batchInfo});
        batch.poll(1000 /* interval(ms) */, 20000 /* timeout(ms) */); // start polling - Do not poll until the batch has started
    });
    batch.on("response", async function (results) { // fired when batch finished and result retrieved
        let jobs = [];
        for (let i = 0; i < results.length; i++) {
            let res = results[i];
            let orgId = orgIds[i];
            jobs.push({
                org_id: orgId,
                job_id: res.id,
                status: res.success ? Status.Created : Status.Ineligible
            });
            if (!res.success) {
                logger.error("Failed to schedule push upgrade job", {org_id: orgId, ...res.errors})
            }
        }
        await upgrades.createUpgradeJobs(upgradeId, itemId, pushReqId, jobs);
    });
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
    if (process.env.ALLOWED_ORGS) {
        // Whitelisting enforced.
        orgIds = orgIds.filter(orgId => {
            let allowed = process.env.ALLOWED_ORGS.indexOf(orgId) !== -1; 
            if (!allowed) {
                logger.warn("Skipping disallowed org", {org_id: orgId});
                return false; 
            } else {
                return true;
            }
        }); 
    }

    if (process.env.DENIED_ORGS) {
        // Blacklisting enforced.
        orgIds = orgIds.filter(orgId => {
            let denied = process.env.DENIED_ORGS.indexOf(orgId) !== -1;
            if (denied) {
                logger.warn("Skipping denied org", {org_id: orgId});
                return false;
            } else {
                return true;
            }
        });
    }

    if (orgIds.length === 0) {
        // Orgs were stripped above, nothing to do 
        return {message: "None of your orgs were allowed to be upgraded"};
    }

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

    let versions = await packageversions.findLatestByGroupIds(versionIds, orgGroupIds);

    if (process.env.ALLOWED_ORGS) {
        // Whitelisting enforced.
        versions = versions.filter(version => {
            let allowed = process.env.ALLOWED_ORGS.indexOf(version.org_id) !== -1;
            if (!allowed) {
                logger.warn("Skipping disallowed org", {org_id: version.org_id});
                return false;
            } else {
                return true;
            }
        });
    }

    if (process.env.DENIED_ORGS) {
        // Blacklisting enforced.
        versions = versions.filter(version => {
            let denied = process.env.DENIED_ORGS.indexOf(version.org_id) !== -1;
            if (denied) {
                logger.warn("Skipping denied org", {org_id: version.org_id});
                return false;
            } else {
                return true;
            }
        });
    }

    if (versions.length === 0) {
        // Orgs were stripped above, nothing to do 
        return {message: "None of your orgs were allowed to be upgraded"};
    }
    
    let items = [];
    let upgrade = await upgrades.createUpgrade(scheduledDate, createdBy, description);
    for (let i = 0; i < versions.length; i++) {
        let version = versions[i];
        let orgKey = version.package_org_id, reqKey = version.package_org_id + version.latest_version_id;

        let conn = conns[orgKey] = conns[orgKey] || await sfdc.buildOrgConnection(version.package_org_id);

        let pushReq = pushReqs[reqKey] = pushReqs[reqKey] || // Initialized if not found
            {item: await createPushRequest(conn, upgrade.id, version.package_org_id, version.latest_version_id, scheduledDate, createdBy), conn: conn, orgIds: []};

        items.push(pushReq.item);
        // Add this particular org id to the batch
        pushReq.orgIds.push(version.org_id);
    }

    // Now, create the jobs 
    Object.entries(pushReqs).forEach(async ([key, pushReq]) => {
        await createPushJob(pushReq.conn, upgrade.id, pushReq.item.id, pushReq.item.push_request_id, pushReq.orgIds);
    });
    
    console.log(JSON.stringify(items));
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

async function findSubscribersByIds(packageOrgIds, orgIds) {
    let records = [];
    for (let i = 0; i < packageOrgIds.length; i++) {
        let conn = await sfdc.buildOrgConnection(packageOrgIds[i]);
        let soql = `SELECT Id, OrgName, InstalledStatus, InstanceName, OrgStatus, 
                    OrgType, MetadataPackageVersionId, OrgKey FROM PackageSubscriber
                    WHERE OrgKey IN ('${orgIds.join("','")}')`;
        try {
            let res = await conn.query(soql);
            records = records.concat(res.records);
        } catch (e) {
            logger.error("Failed to fetch subscribers from org", {org_id: packageOrgIds[i], ...e});
        }
    }
    return records;
}

exports.findRequestsByStatus = findRequestsByStatus;
exports.findRequestsByIds = findRequestsByIds;
exports.findSubscribersByIds = findSubscribersByIds;
exports.findJobsByStatus = findJobsByStatus;
exports.findJobsByRequestIds = findJobsByRequestIds;
exports.findErrorsByJobIds = findErrorsByJobIds;
exports.updatePushRequests = updatePushRequests;
exports.clearRequests = clearRequests;
exports.upgradeOrgs = upgradeOrgs;
exports.upgradeOrgGroups = upgradeOrgGroups;
exports.Status = Status;