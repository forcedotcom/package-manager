'use strict';

const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const packageversions = require('../api/packageversions');
const orggroups = require('../api/orggroups');
const orgpackageversions = require('../api/orgpackageversions');
const upgrades = require('../api/upgrades');
const logger = require('../util/logger').logger;

const JOB_CREATION_BATCH_SIZE = process.env.JOB_CREATION_BATCH_SIZE || (13 * 13);

const SELECT_ALL_SUBSCRIBERS =
    `SELECT OrgName,OrgType,InstalledStatus,InstanceName,OrgStatus,MetadataPackageVersionId,OrgKey,ParentOrg,SystemModstamp
		FROM PackageSubscriber`;

const SELECT_ALL_SUBSCRIBERS_WITHOUT_MODSTAMP =
    `SELECT OrgName,OrgType,InstalledStatus,InstanceName,OrgStatus,MetadataPackageVersionId,OrgKey,ParentOrg
		FROM PackageSubscriber`;

const Status = {
    Created: "Created",
    Pending: "Pending",
    InProgress: "InProgress",
    Succeeded: "Succeeded",
    Failed: "Failed",
    Canceled: "Canceled",
    Ineligible: "Ineligible",
    Invalid: "Invalid"
};
const ActiveStatus = {
    Created: Status.Created,
    Pending: Status.Pending,
    InProgress: Status.InProgress
};
let isActiveStatus = (status) => typeof ActiveStatus[status] !== "undefined";

async function createPushRequest(conn, upgradeId, packageOrgId, versionId, scheduledDate, createdBy, expectedJobCount) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let body = {PackageVersionId: versionId, ScheduledStartTime: isoTime};
    let pushReq = await conn.sobject("PackagePushRequest").create(body);
    return await upgrades.createUpgradeItem(upgradeId, pushReq.id, packageOrgId, versionId, scheduledDate, pushReq.success ? Status.Created : pushReq.errors, createdBy, expectedJobCount);
}

async function createPushJobs(conn, upgradeId, itemId, versionId, pushReqId, orgIds) {
    const batchResult = await batchPushJobs(conn, upgradeId, itemId, versionId, pushReqId, orgIds);
    if (batchResult.failed.length > 0) {
        const moreResults = await createPushJobsFromFailedBatches(conn, upgradeId, itemId, versionId, pushReqId, batchResult.failed);
        batchResult.created.concat(moreResults);
    }

	await upgrades.changeUpgradeItemTotalJobCount(itemId, batchResult.created.length);
}

async function batchPushJobs(conn, upgradeId, itemId, versionId, pushReqId, orgIds) {
    return new Promise(resolve => {
        let pushJobs = [];
        for (let i = 0; i < orgIds.length; i++) {
            pushJobs.push({PackagePushRequestId: pushReqId, SubscriberOrganizationKey: orgIds[i]});
        }

        // FIRST STEP:
        // Create the bulk job.  We need to loop through our jobs and divide them into batches.
        let job = conn.bulk.createJob("PackagePushJob", "insert");

        // NEXT STEP:
        // Create a promise that will slice off one allocation of jobs and batch them. The promise
        // will return both successful jobs AND jobs that fail to schedule.  We want to know about both.
        // It only rejects (fails) when we have some trouble on our end, where the jobs are scheduled but
        // we fail when creating our upgrade job records.
        const processBatch = (start, hooray, boom, done) => {
            if (start >= pushJobs.length) {
                return done(); // All done.
            }

            const batch = job.createBatch();
            const batchJobs = pushJobs.slice(start, start += JOB_CREATION_BATCH_SIZE);
            console.log("EXECUTING BATCH " + start);
            batch.execute(batchJobs);

            // listen for events
            batch.on("error", function (batchInfo) {
                logger.error('Failed to batch load PushUpgradeJob records', batchInfo);
                hooray({error: `Failed to batch load PushUpgradeJob records: ${batchInfo}`, jobs: batchJobs});
                processBatch(start, hooray, boom, done);
            });
            batch.on("queue", function (batchInfo) { // fired when batch request is queued in server.
                logger.debug('Queued batch of PushUpgradeJob records', {...batchInfo});
                batch.poll(3000 /* interval(ms) */, 240000 /* timeout(ms) */); // start polling - Do not poll until the batch has started
            });
            batch.on("response", function (results) { // fired when batch finished and result retrieved
                const orgKeys = batchJobs.map(j => j.SubscriberOrganizationKey);
                handleBatchResponse(upgradeId, itemId, versionId, pushReqId, orgKeys, results).then(recs => {
                    hooray({jobs: recs});
                    processBatch(start, hooray, boom, done);
                }).catch(e => {
                    logger.error("Failed to create upgrade jobs", {error: e.message || e, org_ids: orgKeys.join(',')});
                    boom({message: e.message || e, jobs: batchJobs});
                });
            });
        };

        let created = [];
        let failed = [];
        const batchComplete = result => {
            if (result.error) {
                failed = failed.concat(result.jobs);
            } else {
                created = created.concat(result.jobs);
            }
        };

        const batchSploded = error => {
            failed = failed.concat(error.jobs);
        };

        const batchingFinished = () => {
            resolve({created, failed});
        };

        processBatch(0, batchComplete, batchSploded, batchingFinished);
    });
}

async function handleBatchResponse(upgradeId, itemId, versionId, pushReqId, orgIds, results) {
    let jobs = [];
    const opvValues = [versionId, ...orgIds];
    const opvParams = orgIds.map((v, i) => `$${i + 2}`);
    const opvs = await db.query(
        `SELECT opv.version_id, opv.org_id FROM org_package_version opv, package_version pv
						 WHERE pv.version_id = $1 AND pv.package_id = opv.package_id AND opv.org_id IN (${opvParams.join(",")})`, opvValues);
    const opvMap = new Map();
    opvs.forEach(v => opvMap.set(v.org_id, v));

    for (let i = 0; i < results.length; i++) {
        const res = results[i];
        const opv = opvMap.get(orgIds[i]);
        jobs.push({
            org_id: opv.org_id,
            job_id: res.id,
            status: res.success ? Status.Created : Status.Ineligible,
            message: res.success ? null : res.errors.join(", "),
            original_version_id: opv.version_id
        });
        if (!res.success) {
            logger.warn("Failed to schedule push upgrade job", {org_id: opv.org_id, error: res.errors.join(", ")})
        }
    }
    const recs = await upgrades.createUpgradeJobs(upgradeId, itemId, pushReqId, jobs);
    return recs;
}

async function createPushJobsFromFailedBatches(conn, upgradeId, itemId, versionId, pushReqId, pushJobs) {
    let orgIds = pushJobs.map(j => j.SubscriberOrganizationKey);
    logger.error("Some push job batches failed.  Scheduling org ids now one by one.", {orgIds});

    const opvValues = [versionId, ...orgIds];
    const opvParams = orgIds.map((v, i) => `$${i + 2}`);
    const opvs = await db.query(
        `SELECT opv.version_id, opv.org_id FROM org_package_version opv, package_version pv
						 WHERE pv.version_id = $1 AND pv.package_id = opv.package_id AND opv.org_id IN (${opvParams.join(",")})`, opvValues);
    const opvMap = new Map();
    opvs.forEach(v => opvMap.set(v.org_id, v));

    const jobs = [];
    for (let i = 0; i < pushJobs.length; i++) {
        const pushJob = pushJobs[i];
        const opv = opvMap.get(pushJob.SubscriberOrganizationKey);
        const job = {
            org_id: opv.org_id,
            original_version_id: opv.version_id
        };
        try {
            let pj = await conn.sobject("PackagePushJob").create(pushJobs[i]);
            job.job_id = pj.id;
            job.status = Status.Created;
        } catch (e) {
            logger.error("Failed to schedule push upgrade job", {org_id: opv.org_id, error: e.message || e});
            job.status = Status.Invalid;
            job.message = e.message || e;
        }

        jobs.push(job);
    }

    return await upgrades.createUpgradeJobs(upgradeId, itemId, pushReqId, jobs);
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
        logger.error(`Failed to canceled push upgrade requests`, {
            org_id: packageOrgId,
            count: res.records.length,
            error: e.message || e
        });
    }
}

async function clearRequests(packageOrgIds) {
    for (let i = 0; i < packageOrgIds.length; i++) {
        await cancelRequests(packageOrgIds[i]);
    }
}

async function updatePushRequests(items, status, currentUser) {
    let conns = new Map();
    for (let i = 0; i < items.length; i++) {
        let item = items[i];
        if (currentUser && status === Status.Pending && process.env.ENFORCE_ACTIVATION_POLICY !== "false") {
            if (item.created_by === null) {
                throw `Cannot activate upgrade item ${item.id} without knowing who created it`;
            }
            if (item.created_by === currentUser) {
                throw `Cannot activate upgrade item ${item.id} by the same user ${currentUser} who created it`;
            }
        }

        let conn = conns.get(item.package_org_id);
        if (!conn) {
            try {
                conn = await sfdc.buildOrgConnection(item.package_org_id);
                conns.set(item.package_org_id, conn);
            } catch (e) {
                logger.error("No valid package org found for upgrade item", {
                    id: item.id,
                    package_org_id: item.package_org_id,
                    error: e.message || e
                });
                continue;
            }
        }

        try {
            await conn.sobject('PackagePushRequest').update({Id: item.push_request_id, Status: status});
        } catch (e) {
            logger.error("Failed to update push request", {
                id: item.push_request_id,
                org_id: item.package_org_id,
                url: conn.instanceUrl,
                error: e.message || e
            })
        }
    }
}

async function upgradeOrgs(orgIds, versionIds, scheduledDate, createdBy, description, transid) {
    const whitelist = await orggroups.loadWhitelist();
    if (whitelist.size > 0) {
        orgIds = orgIds.filter(orgId => {
            if (!whitelist.has(orgId)) {
                logger.warn("Skipping org missing from whitelist", {org_id: orgId});
                return false;
            } else {
                return true;
            }
        });
    }

    const blacklisted = [];
    const blacklist = await orggroups.loadBlacklist();
    if (blacklist.size > 0) {
        orgIds = orgIds.filter(orgId => {
            if (blacklist.has(orgId)) {
                logger.warn("Skipping blacklisted org", {org_id: orgId});
                blacklisted.push(orgId);
                return false;
            } else {
                return true;
            }
        });
    }

    if (orgIds.length === 0) {
        // Orgs were stripped above, nothing to do
        return {
            transid,
            message: "None of these orgs are allowed to be upgraded.  Check your blacklist and whitelist groups."
        };
    }

    let upgrade = await upgrades.createUpgrade(scheduledDate, createdBy, description, blacklisted);

    // Collect the information we need up front to create our push requests
    const versions = await packageversions.findByVersionIds(versionIds);
    const reqInfoMap = new Map();
    for (let i = 0; i < versions.length; i++) {
        let version = versions[i];
        const reqKey = version.package_org_id + version.version_id;

        let reqInfo = reqInfoMap.get(reqKey);
        if (!reqInfo) {
            let conn = await sfdc.buildOrgConnection(version.package_org_id);
            reqInfo = {
                package_org_id: version.package_org_id, version_id: version.version_id, conn, orgIds
            };
            reqInfoMap.set(reqKey, reqInfo);
        }
    }

    // Fail fast if all requests are invalid
    if (reqInfoMap.size === 0) {
        return await upgrades.failUpgrade(upgrade, "No valid requests for upgrade");
    }

    const reqs = Array.from(reqInfoMap.values());

    // Now, create all of our request items synchronously
    await createPushRequests(reqs, upgrade, scheduledDate, createdBy);

    // Lastly, create all of the jobs asynchronously
    createJobsForPushRequests(upgrade, reqs).then(() => {
    });

    return upgrade;
}

async function createPushRequests(reqs, upgrade, scheduledDate, createdBy) {
    try {
        for (let i = 0; i < reqs.length; i++) {
            const reqInfo = reqs[i];
            reqInfo.item = await createPushRequest(reqInfo.conn, upgrade.id, reqInfo.package_org_id, reqInfo.version_id, scheduledDate, createdBy, reqInfo.orgIds.length);
        }
        return upgrade;
    } catch (e) {
        return await upgrades.failUpgrade(upgrade, e);
    }
}

async function createJobsForPushRequests(upgrade, reqs) {
    try {
        for (let i = 0; i < reqs.length; i++) {
            const reqInfo = reqs[i];
            await createPushJobs(reqInfo.conn, upgrade.id, reqInfo.item.id, reqInfo.item.version_id, reqInfo.item.push_request_id, reqInfo.orgIds)
        }
        return upgrade;
    } catch (e) {
        return await upgrades.failUpgrade(upgrade, e);
    }
}

async function upgradeOrgGroup(orgGroupId, versionIds, scheduledDate, createdBy, description, transid) {
    const versions = await packageversions.findByVersionIds(versionIds);

    const upgradeVersionsByPackage = new Map();
    versions.forEach(v => {
        let packageVersions = upgradeVersionsByPackage.get(v.package_id);
        if (packageVersions == null) {
            packageVersions = [];
            upgradeVersionsByPackage.set(v.package_id, packageVersions);
        }
        packageVersions.push(v);
    });

    const excludedVersions = null; //await findCurrentAndNewerVersions(versions).map(v => v.version_id);
    let opvs = await orgpackageversions.findAll(versions.map(v => v.package_id), [orgGroupId], excludedVersions, ["Active", "Trial"]);

    const whitelist = await orggroups.loadWhitelist();
    if (whitelist.size > 0) {
        opvs = opvs.filter(opv => {
            if (!whitelist.has(opv.org_id)) {
                logger.warn("Skipping org missing from whitelist", {org_id: opv.org_id});
                return false;
            } else {
                return true;
            }
        });
    }

    const blacklisted = [];
    const blacklist = await orggroups.loadBlacklist();
    if (blacklist.size > 0) {
        opvs = opvs.filter(opv => {
            if (blacklist.has(opv.org_id)) {
                logger.warn("Skipping blacklisted org", {org_id: opv.org_id});
                blacklisted.push(opv.org_id);
                return false;
            } else {
                return true;
            }
        });
    }

    if (opvs.length === 0) {
        // Orgs were stripped above, nothing to do
        return {
            transid,
            message: "None of these orgs are allowed to be upgraded.  Check your blacklist and whitelist groups."
        };
    }

    let upgrade = await upgrades.createUpgrade(scheduledDate, createdBy, description, blacklisted, orgGroupId);

    // Set transient transaction id given by the caller.
    upgrade.transid = transid;

    // Build all required org connections and info about our requests up front
    const connMap = new Map(), reqInfoMap = new Map();
    for (let i = 0; i < opvs.length; i++) {
        let opv = opvs[i];
        let conn = connMap.get(opv.package_org_id);
        if (!conn) {
            try {
                conn = await sfdc.buildOrgConnection(opv.package_org_id);
                connMap.set(opv.package_org_id, conn);
            } catch (e) {
                logger.error("No valid package org found for version", {
                    id: opv.version_id,
                    package_org_id: opv.package_org_id,
                    org_id: opv.org_id,
                    error: e.message || e
                });
                continue;
            }
        }

        // Collect the information we need up front to create our push requests
        const upgradeVersions = upgradeVersionsByPackage.get(opv.package_id).filter(v => v.version_sort > opv.version_sort);

        for (let i = 0; i < upgradeVersions.length; i++) {
            const upgradeVersion = upgradeVersions[i];
            const reqKey = opv.package_org_id + upgradeVersion.version_id;

            let reqInfo = reqInfoMap.get(reqKey);
            if (!reqInfo) {
                reqInfo = {
                    package_org_id: opv.package_org_id, version_id: upgradeVersion.version_id, conn, orgIds: []
                };
                reqInfoMap.set(reqKey, reqInfo);
            }

            // Add this particular org id to the batch
            reqInfo.orgIds.push(opv.org_id);
        }
    }

    // Fail fast if all requests are invalid
    if (reqInfoMap.size === 0) {
        return await upgrades.failUpgrade(upgrade, "No valid requests for upgrade");
    }

    const reqs = Array.from(reqInfoMap.values());

    // Now, create all of our request items synchronously
    await createPushRequests(reqs, upgrade, scheduledDate, createdBy);

    // Lastly, create all of the jobs asynchronously
    createJobsForPushRequests(upgrade, reqs).then(() => {
    });

    return upgrade;
}

async function retryFailedUpgrade(failedId, createdBy, transid) {
    const failedUpgrade = await upgrades.retrieveById(failedId);
    const failedJobs = await upgrades.findJobs(failedId, null, null, null, null, Status.Failed);

    if (failedJobs.length === 0) {
        logger.info("No failed jobs found.  Nothing to retry.", {failedId});
        return null;
    }

    const scheduledDate = new Date();
    const upgrade = await upgrades.createUpgrade(scheduledDate, createdBy, `Retrying: ${failedUpgrade.description}`, null, failedId);

    // Set transient transaction id given by the caller.
    upgrade.transid = transid;

    let connMap = new Map(), reqInfoMap = new Map();

    for (let i = 0; i < failedJobs.length; i++) {
        let job = failedJobs[i];
        let conn = connMap.get(job.package_org_id);
        if (!conn) {
            try {
                conn = await sfdc.buildOrgConnection(job.package_org_id);
                connMap.set(job.package_org_id, conn);
            } catch (e) {
                logger.error("No valid package org found for job", {
                    id: job.id,
                    package_org_id: job.package_org_id,
                    error: e.message || e
                });
                continue;
            }
        }

        // Collect the information we need up front to create our push requests
        let reqKey = job.package_org_id + job.version_id;

        let reqInfo = reqInfoMap.get(reqKey);
        if (!reqInfo) {
            reqInfo = {
                package_org_id: job.package_org_id, version_id: job.version_id, conn, orgIds: []
            };
            reqInfoMap.set(reqKey, reqInfo);
        }

        // Add this particular org id to the batch
        reqInfo.orgIds.push(job.org_id);
    }

    // Fail fast if all requests are invalid
    if (reqInfoMap.size === 0) {
        return await upgrades.failUpgrade(upgrade, "No valid requests for upgrade");
    }

    const reqs = Array.from(reqInfoMap.values());

    // Now, create all of our request items synchronously
    await createPushRequests(reqs, upgrade, scheduledDate, createdBy);

    // Lastly, create all of the jobs, also synchronously, because for retries we want to activate automatically
    await createJobsForPushRequests(upgrade, reqs);

    return upgrade;
}

async function findRequestsByStatus(packageOrgId, status) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let soql = `SELECT Id,PackageVersionId,Status,ScheduledStartTime 
        FROM PackagePushRequest 
        WHERE Status IN (${status.map(v => `'${v}'`).join(",")})`;

    let lastError = null;
    for (let counter = 1; counter <= 5; counter++) {
        try {
            let res = await conn.query(soql);
            return res.records;
        } catch (e) {
            logger.error("Failed to retrieve upgrade requests by status", {
                status,
                packageOrgId,
                retryCounter: counter,
                error: e.message || e
            });
            // This shouldn't happen, the platform is busted, whatever.  Try again.
            lastError = e;
        }
    }
    // This shouldn't happen, the platform is busted, whatever.  Give up.
    throw lastError;
}

async function findRequestsByIds(packageOrgId, requestIds) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let params = requestIds.map(v => `'${v}'`);
    let soql = `SELECT Id,PackageVersionId,Status,ScheduledStartTime 
        FROM PackagePushRequest 
        WHERE Id IN (${params.join(",")})`;

    let lastError = null;
    for (let counter = 1; counter <= 5; counter++) {
        try {
            let res = await conn.query(soql);
            return res.records;
        } catch (e) {
            logger.error("Failed to retrieve upgrade requests", {
                packageOrgId,
                retryCounter: counter,
                error: e.message || e
            });
            // This shouldn't happen, the platform is busted, whatever.  Try again.
            lastError = e;
        }
    }

    // This shouldn't happen, the platform is busted, whatever.  Give up.
    throw lastError;
}

async function findJobsByStatus(packageOrgId, requestIds, status) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let soql = `SELECT Id,PackagePushRequestId,Status,SubscriberOrganizationKey 
        FROM PackagePushJob
        WHERE PackagePushRequestId IN (${status.map(v => `'${v}'`).join(",")})
        AND Status IN (${status.map(v => `'${v}'`).join(",")})`;

    let lastError = null;
    for (let counter = 1; counter <= 5; counter++) {
        try {
            let result = await conn.query(soql);
            let recs = result.records;
            while (!result.done) {
                result = await conn.requestGet(result.nextRecordsUrl);
                recs = recs.concat(result.records);
            }
            return recs;
        } catch (e) {
            logger.error("Failed to retrieve job records by status", {
                status,
                packageOrgId,
                retryCounter: counter,
                error: e.message || e
            });
            // This shouldn't happen, the platform is busted, whatever.  Try again.
            lastError = e;
        }
    }
    // This shouldn't happen, the platform is busted, whatever.  Give up.
    throw lastError;
}

async function findJobsByRequestIds(packageOrgId, requestId) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);
    let soql = `SELECT Id,PackagePushRequestId,Status,SubscriberOrganizationKey 
        FROM PackagePushJob
        WHERE PackagePushRequestId = '${requestId}'
        ORDER BY Id`;

    let lastError = null;
    for (let counter = 1; counter <= 5; counter++) {
        try {
            let result = await conn.query(soql);
            let recs = result.records;
            while (!result.done) {
                result = await conn.requestGet(result.nextRecordsUrl);
                recs = recs.concat(result.records);
            }
            return recs;
        } catch (e) {
            logger.error("Failed to retrieve job records by request id", {
                requestId,
                retryCounter: counter,
                packageOrgId,
                error: e.message || e
            });
            // This shouldn't happen, the platform is busted, whatever.  Try again.
            lastError = e;
        }
    }
    // This shouldn't happen, the platform is busted, whatever.  Give up
    throw lastError;
}

async function findJobsByIds(packageOrgId, jobIds) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let params = jobIds.map(v => `'${v}'`);
    let soql = `SELECT Id,PackagePushRequestId,Status,SubscriberOrganizationKey 
        FROM PackagePushJob
        WHERE Id IN (${params.join(",")})
        ORDER BY Id`;

    let lastError = null;
    for (let counter = 1; counter <= 5; counter++) {
        try {
            let result = await conn.query(soql);
            let recs = result.records;
            while (!result.done) {
                result = await conn.requestGet(result.nextRecordsUrl);
                recs = recs.concat(result.records);
            }
            return recs;

        } catch (e) {
            logger.error("Failed to retrieve job records", {
                packageOrgId,
                retryCounter: counter,
                error: e.message || e
            });
            // This shouldn't happen, the platform is busted, whatever.  Try again.
            lastError = e;
        }
    }
    throw lastError;
}

async function findErrorsByJobIds(packageOrgId, jobIds, limit = 200) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let params = jobIds.map(v => `'${v}'`);
    let soql = `SELECT Id,ErrorDetails,ErrorMessage,ErrorSeverity,ErrorTitle,ErrorType,PackagePushJobId 
        FROM PackagePushError
        WHERE PackagePushJobId IN (${params.join(",")})
        ORDER BY PackagePushJobId LIMIT ${limit}`;

    let lastError = null;
    for (let counter = 1; counter <= 5; counter++) {
        try {
            let result = await conn.query(soql);
            let recs = result.records;
            while (!result.done) {
                result = await conn.requestGet(result.nextRecordsUrl);
                recs = recs.concat(result.records);
            }
            return recs;
        } catch (e) {
            logger.error("Failed to retrieve job errors", {
                packageOrgId,
                retryCounter: counter,
                error: e.message || e
            });
            // This shouldn't happen, the platform is busted, whatever.  Try again.
            lastError = e;
        }
    }
}

exports.findRequestsByStatus = findRequestsByStatus;
exports.findRequestsByIds = findRequestsByIds;
exports.findJobsByStatus = findJobsByStatus;
exports.findJobsByRequestIds = findJobsByRequestIds;
exports.findJobsByIds = findJobsByIds;
exports.findErrorsByJobIds = findErrorsByJobIds;
exports.updatePushRequests = updatePushRequests;
exports.clearRequests = clearRequests;
exports.upgradeOrgs = upgradeOrgs;
exports.upgradeOrgGroup = upgradeOrgGroup;
exports.retryFailedUpgrade = retryFailedUpgrade;
exports.isActiveStatus = isActiveStatus;
exports.Status = Status;
