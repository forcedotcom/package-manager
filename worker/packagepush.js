'use strict';

const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const packageversions = require('../api/packageversions');
const orggroups = require('../api/orggroups');
const orgpackageversions = require('../api/orgpackageversions');
const upgrades = require('../api/upgrades');
const logger = require('../util/logger').logger;

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

async function createPushRequest(conn, upgradeId, packageOrgId, packageVersionId, scheduledDate, createdBy) {
	let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
	let body = {PackageVersionId: packageVersionId, ScheduledStartTime: isoTime};
	let pushReq = await conn.sobject("PackagePushRequest").create(body);
	return await upgrades.createUpgradeItem(upgradeId, pushReq.id, packageOrgId, packageVersionId, scheduledDate, pushReq.success ? Status.Created : pushReq.errors, createdBy);
}

async function createPushJob(conn, upgradeId, itemId, versionId, pushReqId, orgIds) {
	return new Promise((resolve, reject) => {
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
			logger.error('Failed to batch load PushUpgradeJob records', batchInfo);
			reject({message: `Failed to batch load PushUpgradeJob records`, details: batchInfo});
		});
		batch.on("queue", function (batchInfo) { // fired when batch request is queued in server.
			logger.debug('Queued batch of PushUpgradeJob records', {...batchInfo});
			batch.poll(3000 /* interval(ms) */, 240000 /* timeout(ms) */); // start polling - Do not poll until the batch has started
		});
		batch.on("response", async function (results) { // fired when batch finished and result retrieved
			let jobs = [];

			const opvValues = [versionId, ...orgIds];
			const opvParams = orgIds.map((v,i) => `$${i+2}`);
			const opvs = await db.query(
				`SELECT opv.package_version_id, opv.org_id FROM org_package_version opv, package_version pv
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
					original_version_id: opv.package_version_id
				});
				if (!res.success) {
					logger.error("Failed to schedule push upgrade job", {org_id: opv.org_id, error: res.errors.join(", ")})
				}
			}
			try {
				const recs = await upgrades.createUpgradeJobs(upgradeId, itemId, pushReqId, jobs);
				resolve(recs);
			} catch (e) {
				logger.error("Failed to create upgrade jobs", {item: itemId, jobs: jobs.length, error: e.message || e});
				reject(e);
			}
		});
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

async function upgradeOrgs(orgIds, versionIds, scheduledDate, createdBy, description) {
	const whitelist = await orggroups.loadWhitelist();
	if (whitelist) {
		orgIds = orgIds.filter(orgId => {
			if (!whitelist.has(orgId)) {
				logger.warn("Skipping org missing from whitelist", {org_id: orgId});
				return false;
			} else {
				return true;
			}
		});
	}

	const blacklist = await orggroups.loadBlacklist();
	if (blacklist) {
		orgIds = orgIds.filter(orgId => {
			if (blacklist.has(orgId)) {
				logger.warn("Skipping blacklisted org", {org_id: orgId});
				return false;
			} else {
				return true;
			}
		});
	}

	if (orgIds.length === 0) {
		// Orgs were stripped above, nothing to do 
		return {message: "None of these orgs are allowed to be upgraded.  Check your blacklist and whitelist groups."};
	}

	let upgrade = await upgrades.createUpgrade(scheduledDate, createdBy, description);
	
	let versions = await packageversions.findByVersionIds(versionIds);
	try {
		for (let i = 0; i < versions.length; i++) {
			let version = versions[i];
			let conn = await sfdc.buildOrgConnection(version.package_org_id);
			let item = await createPushRequest(conn, upgrade.id, version.package_org_id, version.version_id, scheduledDate, createdBy);
			await createPushJob(conn, upgrade.id, item.id, item.package_version_id, item.push_request_id, orgIds);
		}
	} catch (e) {
		await upgrades.failUpgrade(upgrade);
		throw e;
	}
	return upgrade;
}

async function findCurrentAndNewerVersions(versions) {
	let newer = [];
	for (let i = 0; i < versions.length; i++) {
		const v = versions[i];
		newer = newer.concat(await packageversions.findNewerVersions(v.package_id, v.version_sort));
	}
	return newer;
}

async function upgradeOrgGroups(orgGroupIds, versionIds, scheduledDate, createdBy, description) {
	const conns = new Map(), pushReqs = new Map();

	const versions = await packageversions.findByVersionIds(versionIds);
	
	const upgradeVersionsByPackage = new Map();
	versions.forEach(v => upgradeVersionsByPackage.set(v.package_id, v));
	
	const currentAndNewer = await findCurrentAndNewerVersions(versions);
	
	let opvs = await orgpackageversions.findAll(versions.map(v => v.package_id), orgGroupIds, currentAndNewer.map(v => v.version_id));

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

	const blacklist = await orggroups.loadBlacklist();
	if (blacklist) {
		opvs = opvs.filter(opv => {
			if (blacklist.has(opv.org_id)) {
				logger.warn("Skipping blacklisted org", {org_id: opv.org_id});
				return false;
			} else {
				return true;
			}
		});
	}

	if (opvs.length === 0) {
		// Orgs were stripped above, nothing to do 
		return {message: "None of your orgs were allowed to be upgraded"};
	}

	let upgrade = await upgrades.createUpgrade(scheduledDate, createdBy, description);
	for (let i = 0; i < opvs.length; i++) {
		let opv = opvs[i];
		let conn = conns.get(opv.package_org_id);
		if (!conn) {
			try {
				conn = await sfdc.buildOrgConnection(opv.package_org_id);
				conns.set(opv.package_org_id, conn);
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

		const upgradeVersion = upgradeVersionsByPackage.get(opv.package_id);
		let reqKey = opv.package_org_id + upgradeVersion.version_id;
		
		let pushReq = pushReqs.get(reqKey);
		if (!pushReq) {
			pushReq = {
				item: await createPushRequest(conn, upgrade.id, opv.package_org_id, upgradeVersion.version_id, scheduledDate, createdBy),
				conn: conn,
				orgIds: []
			};
			pushReqs.set(reqKey, pushReq);
		}

		// Add this particular org id to the batch
		pushReq.orgIds.push(opv.org_id);
	}

	// Now, create the jobs, asynchronously
	const reqs = [];
	pushReqs.forEach(pushReq => 
		reqs.push(createPushJob(pushReq.conn, upgrade.id, pushReq.item.id, pushReq.item.package_version_id, pushReq.item.push_request_id, pushReq.orgIds))
	);
	Promise.all(reqs).then(results => {})
		.catch (e => upgrades.failUpgrade(upgrade, e).then(() => {}));

	// Return our upgrade (before our jobs) so we can redirect and wait for the jobs to finish scheduling.
	return upgrade;
}

async function retryFailedUpgrade(id, createdBy) {
	let conns = new Map(), pushReqs = new Map();

	const failedUpgrade = await upgrades.retrieveById(id);
	const failedJobs = await upgrades.findJobs(id, null, null, null, Status.Failed);
	
	if (failedJobs.length === 0) {
		logger.info("No failed jobs found.  Nothing to retry.", {id})
		return null;
	}

	let items = [];
	const scheduledDate = new Date();
	const upgrade = await upgrades.createUpgrade(scheduledDate, createdBy, `Retrying: ${failedUpgrade.description}`);
	for (let i = 0; i < failedJobs.length; i++) {
		let job = failedJobs[i];
		let conn = conns.get(job.package_org_id);
		if (!conn) {
			try {
				conn = await sfdc.buildOrgConnection(job.package_org_id);
				conns.set(job.package_org_id, conn);
			} catch (e) {
				logger.error("No valid package org found for job", {
					id: job.id,
					package_org_id: job.package_org_id,
					error: e.message || e
				});
				continue;
			}
		}

		let reqKey = job.package_org_id + job.version_id;
		
		let pushReq = pushReqs.get(reqKey);
		if (!pushReq) {
			pushReq = {
				item: await createPushRequest(conn, upgrade.id, job.package_org_id, job.version_id, scheduledDate, createdBy),
				conn: conn,
				orgIds: []
			};
			pushReqs.set(reqKey, pushReq);
		}

		items.push(pushReq.item);
		// Add this particular org id to the batch
		pushReq.orgIds.push(job.org_id);
	}

	// Now, create the jobs, asynchronously
	const reqs = [];
	pushReqs.forEach(pushReq =>
		reqs.push(createPushJob(pushReq.conn, upgrade.id, pushReq.item.id, pushReq.item.package_version_id, pushReq.item.push_request_id, pushReq.orgIds))
	);
	Promise.all(reqs).then(results => {})
	.catch (e => upgrades.failUpgrade(upgrade, e).then(() => {}));

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

async function findJobsByRequestIds(packageOrgId, requestId) {
	let conn = await sfdc.buildOrgConnection(packageOrgId);
	let soql = `SELECT Id,PackagePushRequestId,Status,SubscriberOrganizationKey 
        FROM PackagePushJob
        WHERE PackagePushRequestId = '${requestId}'
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

async function findErrorsByJobIds(packageOrgId, jobIds, limit = 200) {
	let conn = await sfdc.buildOrgConnection(packageOrgId);

	let params = jobIds.map(v => `'${v}'`);
	let soql = `SELECT Id,ErrorDetails,ErrorMessage,ErrorSeverity,ErrorTitle,ErrorType,PackagePushJobId 
        FROM PackagePushError
        WHERE PackagePushJobId IN (${params.join(",")})
        ORDER BY PackagePushJobId LIMIT ${limit}`;

	let result = await conn.query(soql);
	let recs = result.records;
	while (!result.done) {
		try {
			result = await conn.requestGet(result.nextRecordsUrl);
			recs = recs.concat(result.records);
		} catch (e) {
			logger.error("Failed to retrieve error records", {
				packageOrgId,
				queryUrl: result.nextRecordsUrl,
				error: e.message || e
			});
			return recs; // Bail.  This shouldn't happen, the platform is busted, whatever.
		}
	}
	return recs;
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
				conn.bulk.pollTimeout = 240000;
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
		queries.push(p.catch(error => error));
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
exports.retryFailedUpgrade = retryFailedUpgrade;
exports.Status = Status;
exports.isActiveStatus = isActiveStatus;
exports.bulkFindSubscribersByIds = bulkFindSubscribersByIds;
