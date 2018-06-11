'use strict';

const sfdc = require('../api/sfdcconn');
const packageversions = require('../api/packageversions');
const upgrades = require('../api/upgrades');
const logger = require('../util/logger').logger;

const Status = {Created: "Created", Pending: "Pending", InProgress: "InProgress", Activating: "Activating", Canceling: "Canceling", Succeeded: "Succeeded", Failed: "Failed", Canceled: "Canceled", Ineligible: "Ineligible"};
const ActiveStatus = {Created: Status.Created, Pending: Status.Pending, InProgress: Status.InProgress, Activating: Status.Activating, Canceling: Status.Canceling};
let isActiveStatus = (status) => typeof ActiveStatus[status] !== "undefined";

async function createPushRequest(conn, upgradeId, packageOrgId, packageVersionId, scheduledDate, createdBy) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let body = {PackageVersionId: packageVersionId, ScheduledStartTime: isoTime};
    let pushReq = await conn.sobject("PackagePushRequest").create(body);
    return await upgrades.createUpgradeItem(upgradeId, pushReq.id, packageOrgId, packageVersionId, scheduledDate, pushReq.success ? Status.Created : pushReq.errors, createdBy);
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
                status: res.success ? Status.Created : Status.Ineligible,
                message: res.success ? null : res.errors.join(", ")
            });
            if (!res.success) {
                logger.error("Failed to schedule push upgrade job", {org_id: orgId, error: res.errors.join(", ")})
            }
        }
        try {
            await upgrades.createUpgradeJobs(upgradeId, itemId, pushReqId, jobs)
        } catch (e) {
            logger.error("Failed to create upgrade jobs", {item: itemId, jobs: jobs.length, error: e.message || e})
        }
    });
}

async function cancelRequests(packageOrgId) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);
    let res = await conn.query(`SELECT Id,PackageVersionId,Status,ScheduledStartTime FROM PackagePushRequest WHERE Status = '${Status.Created}'`);
    if (res.records.length === 0)
        return logger.info("No requests found to cancel", {org_id: packageOrgId});
    
    logger.info(`Canceling push upgrade requests`, {org_id: packageOrgId, count: res.records.length});
    let canceled = res.records.map((v) => {
        return conn.sobject('PackagePushRequest').update({Id: v.Id, Status: Status.Canceled});
    });
    try {
        await Promise.all(canceled);
        logger.info(`Canceled push upgrade requests`, {org_id: packageOrgId, count: res.records.length});
    } catch (e) {
        logger.error(`Failed to canceled push upgrade requests`, {org_id: packageOrgId, count: res.records.length, error: e.message || e});
    }
}

async function clearRequests(packageOrgIds) {
    for (let i = 0; i < packageOrgIds.length; i++) {
        await cancelRequests(packageOrgIds[i]);
    }
}

async function updatePushRequests(items, status, currentUser) {
    let conns = {};
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

        let conn = conns[item.package_org_id];
        if (!conn) {
            try {
                conn = await sfdc.buildOrgConnection(item.package_org_id);
                conns[item.package_org_id] = conn;
            } catch (e) {
                logger.error("No valid package org found for upgrade item", {id: item.id, package_org_id: item.package_org_id, error: e.message || e});
                continue;
            }
        }
        
        try {
            await conn.sobject('PackagePushRequest').update({Id: item.push_request_id, Status: status});
        } catch (e) {
            logger.error("Failed to update push request", {id: item.push_request_id, org_id: item.package_org_id, url: conn.instanceUrl, error: e.message || e})
        }
    }
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

        let conn = conns[version.package_org_id];
        if (!conn) {
            try {
                conn = await sfdc.buildOrgConnection(version.package_org_id);
                conns[version.package_org_id] = conn;
            } catch (e) {
                logger.error("No valid package org found for version", {id: version.version_id, package_org_id: version.package_org_id, org_id: version.org_id, error: e.message || e});
                continue;
            }
        }

        let reqKey = version.package_org_id + version.latest_version_id;
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
        WHERE PackagePushRequestId IN (${params.join(",")})
        ORDER BY Id`;

    let res = await conn.query(soql);
    return res.records;
}

async function findJobsByIds(packageOrgId, jobIds) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let params = jobIds.map(v => `'${v}'`);
    let soql = `SELECT Id,PackagePushRequestId,Status,SubscriberOrganizationKey 
        FROM PackagePushJob
        WHERE Id IN (${params.join(",")})
        ORDER BY Id`;

    let res = await conn.query(soql);
    return res.records;
}

async function findErrorsByJobIds(packageOrgId, jobIds) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let params = jobIds.map(v => `'${v}'`);
    let soql = `SELECT Id,ErrorDetails,ErrorMessage,ErrorSeverity,ErrorTitle,ErrorType,PackagePushJobId 
        FROM PackagePushError
        WHERE PackagePushJobId IN (${params.join(",")})
        ORDER BY PackagePushJobId`;

    let res = await conn.query(soql);
    return res.records;
}

async function findSubscribersByIds(packageOrgIds, orgIds) {
    let subs = [];
    for (let i = 0; i < packageOrgIds.length; i++) {
        let conn = await sfdc.buildOrgConnection(packageOrgIds[i]);
        let soql = `SELECT Id, OrgName, InstalledStatus, InstanceName, OrgStatus, 
                    OrgType, MetadataPackageVersionId, OrgKey FROM PackageSubscriber
                    WHERE OrgKey IN ('${orgIds.join("','")}')`;
        try {
            let res = await conn.query(soql);
            subs = subs.concat(res.records);
        } catch (e) {
            logger.error("Failed to fetch subscribers from org", {org_id: packageOrgIds[i], error: e.message || e});
        }
    }
    return subs;
}

function bulkFindSubscribersByIds(packageOrgIds, orgIds) {
    let queries = [];
    for (let i = 0; i < packageOrgIds.length; i++) {
        let p = new Promise((resolve, reject) => {
            let soql = `SELECT Id, OrgName, InstalledStatus, InstanceName, OrgStatus, 
                    OrgType, MetadataPackageVersionId, OrgKey FROM PackageSubscriber
                    WHERE OrgKey IN ('${orgIds.join("','")}')`;
            sfdc.buildOrgConnection(packageOrgIds[i]).then(conn => {
                let subs = [];
                conn.bulk.pollTimeout = 30 * 1000;
                conn.bulk.query(soql)
                    .on("record", rec => {
                        subs.push(rec);
                    })
                    .on("end", async () => {
                        resolve(subs);
                    })
                    .on("error", error => {
                        reject(error);
                    });
            });
        });
        queries.push(p);
    }
    return Promise.all(queries);
}


exports.findRequestsByStatus = findRequestsByStatus;
exports.findRequestsByIds = findRequestsByIds;
exports.findSubscribersByIds = findSubscribersByIds;
exports.findJobsByStatus = findJobsByStatus;
exports.findJobsByRequestIds = findJobsByRequestIds;
exports.findJobsByIds = findJobsByIds;
exports.findErrorsByJobIds = findErrorsByJobIds;
exports.updatePushRequests = updatePushRequests;
exports.clearRequests = clearRequests;
exports.upgradeOrgs = upgradeOrgs;
exports.upgradeOrgGroups = upgradeOrgGroups;
exports.Status = Status;
exports.isActiveStatus = isActiveStatus;
exports.bulkFindSubscribersByIds = bulkFindSubscribersByIds;
