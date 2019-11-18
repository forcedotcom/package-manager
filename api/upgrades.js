const db = require('../util/pghelper');
const push = require('../worker/packagepush');
const admin = require('./admin');
const logger = require('../util/logger').logger;
const strings = require('../util/strings');
const sfdc = require('./sfdcconn');
const orgpackageversions = require('./orgpackageversions');

const State = {
	Ready: "Ready",
	Blocked: "Blocked",
	Running: "Running",
	Partial: "Partial",
	Complete: "Complete"
};

const UpgradeStatus = {
	Ready: "Ready",
	Active: "Active",
	Done: "Done",
	Canceled: "Canceled",
	Failed: "Failed"
};

const MAX_ERROR_COUNT = 20;

const ITEM_STATUS_SOQL = `
	CASE
		 WHEN -- ALL Created == Inactive
           count(i.*) = 0 THEN 'Invalid'
	     WHEN -- ALL Created == Inactive
         count(CASE 
                      WHEN i.status = 'Created' THEN 1
                      ELSE NULL END) = count(i.*) THEN 'Scheduled'
         WHEN -- At least one canceled == Canceled
         count(CASE 
                      WHEN i.status = 'Canceled' THEN 1
                      ELSE NULL END) > 0 THEN 'Canceled'
         WHEN -- At least one create, pending or in progress == Active
         count(CASE 
                      WHEN i.status = 'Created' THEN 1
                      WHEN i.status = 'Pending' THEN 1
                      WHEN i.status = 'InProgress' THEN 1
                      ELSE NULL END) > 0 THEN 'Active'
         WHEN -- At least one failed or ineligible == Failed
         count(CASE 
                      WHEN i.status = 'Failed' THEN 1
                      WHEN i.status = 'Ineligible' THEN 1
                      ELSE NULL END) > 0 THEN 'Complete with failures'
         ELSE -- All done and succeeded == Succeeded
         'Complete' 
	END item_status`;

const SELECT_ALL = `
    SELECT u.id, u.status, u.start_time, u.created_by, u.description, u.org_group_id, u.parent_id,
    CAST (SUM(i.total_job_count) AS INTEGER) total_job_count,
    ${ITEM_STATUS_SOQL}    
    FROM upgrade u
    LEFT JOIN upgrade_item i ON i.upgrade_id = u.id`;

const GROUP_BY_ALL = `GROUP BY u.id, u.start_time, u.created_by, u.description`;

const SELECT_ONE = `
    SELECT u.id, u.status, u.start_time, u.created_by, u.description, u.org_group_id, u.parent_id, u.comment,
    CAST (SUM(i.total_job_count) AS INTEGER) total_job_count,
	${ITEM_STATUS_SOQL}
    FROM upgrade u
    LEFT JOIN upgrade_item i ON i.upgrade_id = u.id
    WHERE u.id = $1
    GROUP by u.id, u.start_time, u.created_by, u.description`;

const SELECT_ALL_ITEMS = `SELECT i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, i.status, i.created_by, i.total_job_count,
        u.description,
        pv.version_number, pv.version_id, pv.version_sort,
        p.name package_name, p.sfid package_id, p.dependency_tier,
        CAST (count(j.*) AS INTEGER) job_count, 
        CAST (count(NULLIF(j.status, 'Ineligible')) AS INTEGER) eligible_job_count,
        CAST (count(CASE
			WHEN j.status = 'Created' THEN 1
			ELSE NULL END) AS INTEGER) created_job_count,		
	  	CAST (count(CASE
			WHEN j.status = 'Failed' THEN 1
			ELSE NULL END) AS INTEGER) failed_job_count,
	  	CAST (count(CASE
			WHEN j.status = 'Invalid' THEN 1
			ELSE NULL END) AS INTEGER) invalid_job_count,
		CAST (count(CASE
			WHEN j.status = 'Canceled' THEN 1
			ELSE NULL END) AS INTEGER) canceled_job_count,
		CAST (count(CASE
			WHEN j.status = 'Pending' THEN 1
			ELSE NULL END) AS INTEGER) pending_job_count,
		CAST (count(CASE
			WHEN j.status = 'InProgress' THEN 1
			ELSE NULL END) AS INTEGER) inprogress_job_count,
		CAST (count(CASE
			WHEN j.status = 'Succeeded' THEN 1
			ELSE NULL END) AS INTEGER) succeeded_job_count
        FROM upgrade_item i
        inner join upgrade u on u.id = i.upgrade_id
        inner join package_version pv on pv.version_id = i.version_id
        inner join package p on p.sfid = pv.package_id
        left join upgrade_job j on j.item_id = i.id`;

const GROUP_BY_ITEMS = `GROUP BY i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, i.status,
        u.description,
        pv.version_number, pv.version_id, pv.version_sort,
        p.name, p.sfid`;

const SELECT_ALL_ITEMS_BY_UPGRADE = `${SELECT_ALL_ITEMS} WHERE i.upgrade_id = $1 ${GROUP_BY_ITEMS}`;

const SELECT_ONE_ITEM = `SELECT i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, i.status, i.created_by, i.total_job_count,
        u.description,
        pv.version_number, pv.version_id,
        p.name package_name, p.dependency_tier,
                CAST (count(j.*) AS INTEGER) job_count, 
        CAST (count(NULLIF(j.status, 'Ineligible')) AS INTEGER) eligible_job_count,		
	  	CAST (count(CASE
			WHEN j.status = 'Created' THEN 1
			ELSE NULL END) AS INTEGER) created_job_count,
		CAST (count(CASE
			WHEN j.status = 'Failed' THEN 1
			ELSE NULL END) AS INTEGER) failed_job_count,
	  	CAST (count(CASE
			WHEN j.status = 'Invalid' THEN 1
			ELSE NULL END) AS INTEGER) invalid_job_count,
		CAST (count(CASE
			WHEN j.status = 'Canceled' THEN 1
			ELSE NULL END) AS INTEGER) canceled_job_count,
		CAST (count(CASE
			WHEN j.status = 'Pending' THEN 1
			ELSE NULL END) AS INTEGER) pending_job_count,
		CAST (count(CASE
			WHEN j.status = 'InProgress' THEN 1
			ELSE NULL END) AS INTEGER) inprogress_job_count,
		CAST (count(CASE
			WHEN j.status = 'Succeeded' THEN 1
			ELSE NULL END) AS INTEGER) succeeded_job_count
        FROM upgrade_item i
        INNER JOIN upgrade u on u.id = i.upgrade_id
        INNER JOIN package_version pv on pv.version_id = i.version_id
        INNER JOIN package p on p.sfid = pv.package_id
		left join upgrade_job j on j.item_id = i.id`;

const SELECT_ITEMS_WITH_JOBS = `SELECT distinct i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, i.status, i.created_by, i.total_job_count
        FROM upgrade_job j
        INNER JOIN upgrade_item i on i.push_request_id = j.push_request_id`;

const SELECT_ALL_JOBS = `SELECT j.id, j.upgrade_id, j.push_request_id, j.job_id, j.org_id, o.instance, j.status,
        i.start_time, i.created_by,
        pv.version_number, pv.version_id, pv.version_sort,
        opv.install_date,
        pvc.version_number current_version_number, pvc.version_id current_version_id, pvc.version_sort current_version_sort,
        pvo.version_number original_version_number, pvo.version_id original_version_id, pvo.version_sort original_version_sort,
        p.name package_name, p.sfid package_id, p.package_org_id, p.dependency_tier,
        a.account_name,
        j.message
        FROM upgrade_job j
        INNER JOIN upgrade_item i on i.push_request_id = j.push_request_id
        INNER JOIN package_version pv on pv.version_id = i.version_id
        INNER JOIN org_package_version opv on opv.package_id = pv.package_id AND opv.org_id = j.org_id
        INNER JOIN package_version pvc on pvc.version_id = opv.version_id
        LEFT JOIN package_version pvo on pvo.version_id = j.original_version_id
        INNER JOIN package p on p.sfid = pv.package_id
        INNER JOIN org o on o.org_id = j.org_id
        LEFT JOIN account a ON a.account_id = o.account_id`;

async function createUpgrade(scheduledDate, createdBy, description, blacklisted, orgGroupId, parentId) {
	let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
	let recs = await db.insert('INSERT INTO upgrade (start_time,created_by,description,status,org_group_id,parent_id) VALUES ($1,$2,$3,$4,$5,$6)', [isoTime, createdBy, description, UpgradeStatus.Ready, orgGroupId, parentId]);
	if (blacklisted && blacklisted.length !== 0) {
		createUpgradeBlacklist(recs[0].id, blacklisted).then(() => {});
	}
	return recs[0];
}

async function createUpgradeBlacklist(upgradeId, orgIds) {
	let sql = `INSERT INTO upgrade_blacklist (upgrade_id, org_id) VALUES`;
	let values = [upgradeId];
	for (let i = 0, n = 1 + values.length; i < orgIds.length; i++) {
		const orgId = orgIds[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($1,$${n++})`;
		values.push(orgId);
	}

	const recs = await db.insert(sql, values);
	admin.emit(admin.Events.UPGRADE_BLACKLIST, recs);
	return recs;
}

async function failUpgrade(upgrade, error) {
	logger.error("Failed to schedule upgrade", {message: error.message || error});
	upgrade.message = error.message || error;
	upgrade.status = UpgradeStatus.Failed;
	await db.update(`UPDATE upgrade set status = $1 WHERE id = $2`, [upgrade.status, upgrade.id]);
	return upgrade;
}

async function createUpgradeItem(upgradeId, requestId, packageOrgId, versionId, scheduledDate, status, createdBy, expectedJobCount) {
	let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
	let recs = await db.insert('INSERT INTO upgrade_item' +
		' (upgrade_id, push_request_id, package_org_id, version_id, start_time, status, created_by, total_job_count)' +
		' VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
		[upgradeId, requestId, packageOrgId, versionId, isoTime, status, createdBy, expectedJobCount]);
	return recs[0];
}

async function changeUpgradeItemTotalJobCount(itemId, count) {
	try {
		await db.update(`UPDATE upgrade_item SET total_job_count = $1 WHERE id = $2`, [count, itemId]);
		admin.emit(admin.Events.UPGRADE_ITEMS, [itemId]);
	} catch (error) {
		logger.error("Failed to update upgrade item", {itemId, count, error: error.message || error});
	}
}

async function changeUpgradeJobStatus(items, toStatus, ...fromStatus) {
	let values = [toStatus];
	const params = [];
	for (let i = 0, p = values.length+1; i < items.length; i++) {
		items[i].status = toStatus;
		values.push(items[i].id);
		params.push(`$${p++}`);
	}

	// Only update records where the message is not set. It means the status is already set too.
	let whereMessage = `AND message IS NULL`;

	// If a fromStatus is provided, only update records with that status.
	let whereStatus = '';
	if (fromStatus.length > 0) {
		whereStatus = `AND status IN (${fromStatus.map((o,i) => `$${i+1+values.length}`).join(",")})`;
		values = values.concat(fromStatus);
	}

	let sql = `UPDATE upgrade_job SET status = $1 WHERE item_id IN (${params.join(",")}) 
		${whereMessage} 
		${whereStatus}`;
	await db.update(sql, values);
}

async function changeUpgradeItemStatus(items, status) {
	const values = [status];
	const params = [];
	for (let i = 0, p = values.length+1; i < items.length; i++) {
		items[i].status = status;
		values.push(items[i].id);
		params.push(`$${p++}`);
	}

	await db.update(`UPDATE upgrade_item SET status = $1 WHERE id IN (${params.join(",")})`, values);
}

async function updateUpgradeItemsFromPushRequests(items, pushReqs) {
	const updated = [];

	// Populate existing upgrade jobs map
	const itemsByRequestId = new Map();
	items.forEach(i => itemsByRequestId.set(i.push_request_id, i));

	// First, Loop through all push jobs and create upgrade jobs as needed.
	for (let u = 0; u < pushReqs.length; u++) {
		const pushReq = pushReqs[u];
		const item = itemsByRequestId.get(sfdc.normalizeId(pushReq.Id));

		// Check if our local status matches the remote status. If so, we can skip.
		if (pushReq.Status === item.status)
			continue;

		// New status, so update our local copy.
		item.status = pushReq.Status;
		updated.push(item);
	}

	if (updated.length > 0) {
		await updateUpgradeItemStatus(updated);
		admin.emit(admin.Events.UPGRADE_ITEMS, updated);
	}

	return {updated: updated.length};
}

async function updateUpgradeJobsFromPushJobs(upgradeJobs, pushJobs) {
	let created = [];
	let updated = [];
	let upgraded = [];
	let errored = [];

	// Populate existing upgrade jobs map
	const upgradeJobsById = new Map();
	upgradeJobs.forEach(j => upgradeJobsById.set(j.job_id, j));

	// First, Loop through all push jobs and create upgrade jobs as needed.
	for (let u = 0; u < pushJobs.length; u++) {
		const pushJob = pushJobs[u];
		const upgradeJob = upgradeJobsById.get(sfdc.normalizeId(pushJob.Id));

		if (!upgradeJob) {
			// Create new job.  Something went wrong when scheduling originally...
			created.push({
				upgrade_id: pushJob.item.upgrade_id,
				item_id: pushJob.item.id,
				push_request_id: sfdc.normalizeId(pushJob.PackagePushRequestId),
				org_id: pushJob.SubscriberOrganizationKey,
				job_id: sfdc.normalizeId(pushJob.Id),
				status: pushJob.Status,
				message: null,
				original_version_id: null // Could add another query against orgs, but org data could be wrong anyway
			});
		}
	}
	// Update our map to ensure our cache of upgrade jobs have the ids from what we just created.
	if (created.length > 0) {
		created = await createJobs(created);
		created.forEach(j => upgradeJobsById.set(j.job_id, j));
	}

	// Now loop through all push jobs and update status as needed.
	for (let u = 0; u < pushJobs.length; u++) {
		const pushJob = pushJobs[u];
		const upgradeJob = upgradeJobsById.get(sfdc.normalizeId(pushJob.Id));

		// Check if our local status matches the remote status. If so, we can skip.
		if (pushJob.Status === upgradeJob.status)
			continue;

		// New status, so update our local copy.
		updated.push(upgradeJob);

		if (pushJob.Status === push.Status.Failed) {
			// Special handling for errored later.  Don't set the status in updateJob object yet.
			errored.push(upgradeJob);
			continue;
		}

		if (pushJob.Status === push.Status.Succeeded) {
			upgraded.push(upgradeJob);
		}
		upgradeJob.status = pushJob.Status;
	}

	if (errored.length > 0) {
		for (let i = 0; i < errored.length; i++) {
			const erroredJob = errored[i];
			const pushErrors = await push.findErrorsByJobIds(erroredJob.package_org_id, [erroredJob.job_id], MAX_ERROR_COUNT);
			let errors = pushErrors.map(err => {
				return {title: err.ErrorTitle, details: err.ErrorDetails, message: err.ErrorMessage}
			});
			if (errors.length === 0) {
				if (erroredJob.message == null) {
					erroredJob.message = JSON.stringify([{
						title: "Unknown failure",
						details: "",
						message: "Unknown failure. No error message given from push upgrade API."
					}]);
				}
			} else {
				erroredJob.message = JSON.stringify(errors);
			}

			erroredJob.status = push.Status.Failed;
		}
	}

	if (upgraded.length > 0) {
		await orgpackageversions.updateOrgPackageVersions(upgraded);
	}

	if (updated.length > 0) {
		await updateUpgradeJobsStatus(updated);
		admin.emit(admin.Events.UPGRADE_JOBS, updated);
	}

	return {created: created.length, updated: updated.length, succeeded: upgraded.length, errored: errored.length};
}

async function createJobs(jobs, batchSize = 2000) {
	let count = jobs.length, recs = [];
	for (let start = 0; start < count;) {
		recs = recs.concat(await createJobsBatch(jobs.slice(start, start += batchSize)));
	}

	admin.emit(admin.Events.UPGRADE_JOBS, recs);
	return recs;
}

async function createJobsBatch(jobs) {
	let sql = `INSERT INTO upgrade_job (upgrade_id, item_id, push_request_id, job_id, org_id, status, message, original_version_id) VALUES`;
	let values = [];
	for (let i = 0, n = 1; i < jobs.length; i++) {
		const job = jobs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(job.upgrade_id, job.item_id, job.push_request_id, job.job_id, job.org_id, job.status, job.message, job.original_version_id);
	}

	return db.insert(sql, values);
}

async function updateUpgradeItemStatus(updated) {
	let n = 0;
	let params = [];
	let values = [];
	updated.forEach(u => {
		params.push(`($${++n}::INTEGER,$${++n})`);
		values.push(u.id, u.status);
	});
	let sql = `UPDATE upgrade_item as t 
			SET status = u.status
			FROM ( VALUES ${params.join(",")} ) as u(id, status)
			WHERE u.id = t.id`;
	await db.update(sql, values);
}

async function updateUpgradeJobsStatus(jobs) {
	let n = 0;
	let params = [];
	let values = [];
	jobs.forEach(j => {
		params.push(`($${++n}::INTEGER,$${++n},$${++n})`);
		values.push(j.id, j.status, j.message);
	});
	let sql = `UPDATE upgrade_job as t 
			SET status = j.status, message = j.message
			FROM ( VALUES ${params.join(",")} ) as j(id, status, message)
			WHERE j.id = t.id`;
	await db.update(sql, values);
}

async function requestAll(req, res, next) {
	try {
		let upgrades = await findAll(req.query.groupId, req.query.sort_field, req.query.sort_dir);
		return res.json(upgrades);
	} catch (e) {
		next(e);
	}
}

async function findAll(groupId, sortField, sortDir) {
	let where = '';
	let values = [];
	if (groupId) {
		values.push(groupId);
		where = `WHERE org_group_id = $${values.length}`;
	}
	let orderBy = `ORDER BY ${sortField || "start_time"} ${sortDir || "asc"}`;
	return await db.query(`${SELECT_ALL} ${where} ${GROUP_BY_ALL} ${orderBy}`, values)
}

async function requestItems(req, res, next) {
	try {
		let items;
		if (req.query.upgradeId) {
			items = await findItemsByUpgrade(req.query.upgradeId, req.query.sort_field, req.query.sort_dir);
		} else if (req.query.packageId) {
			items = await findItemsByPackage(req.query.packageId, req.query.sort_field, req.query.sort_dir);
		} else if (req.query.packageOrgId) {
			items = await findItemsByPackageOrg(req.query.packageOrgId, req.query.sort_field, req.query.sort_dir);
		}
		return res.json(items);
	} catch (e) {
		next(e);
	}
}

async function findItemsByIds(itemIds) {
	let whereParts = [];
	let values = [];
	if (itemIds) {
		let params = [];
		for (let i = 1; i <= itemIds.length; i++) {
			params.push('$' + i);
		}
		whereParts.push(`i.id IN (${params.join(",")})`);
		values = values.concat(itemIds);
	}

	const where = `WHERE ${whereParts.join(" AND")}`;
	const order = `ORDER BY dependency_tier`;
	return await db.query(`${SELECT_ALL_ITEMS} ${where} ${GROUP_BY_ITEMS} ${order}`, values)
}

async function findItemsByUpgrade(upgradeId, sortField, sortDir) {
	if (Array.isArray(sortField)) {
		sortField = sortField.join(",");
	}
	let orderBy = `ORDER BY  ${sortField || "push_request_id"} ${sortDir || "asc"}`;
	return await db.query(`${SELECT_ALL_ITEMS_BY_UPGRADE} ${orderBy}`, [upgradeId])
}

async function findItemsByPackage(packageId, sortField, sortDir) {
	if (Array.isArray(sortField)) {
		sortField = sortField.join(",");
	}
	let order = `ORDER BY  ${sortField || "push_request_id"} ${sortDir || "asc"}`;
	let where = `WHERE p.sfid = $1`;
	return await db.query(`${SELECT_ALL_ITEMS} ${where} ${GROUP_BY_ITEMS} ${order}`, [packageId])
}

async function findItemsByPackageOrg(packageOrgId, sortField, sortDir) {
	if (Array.isArray(sortField)) {
		sortField = sortField.join(",");
	}
	let order = `ORDER BY  ${sortField || "push_request_id"} ${sortDir || "asc"}`;
	let where = `WHERE i.package_org_id = $1`;
	return await db.query(`${SELECT_ALL_ITEMS} ${where} ${GROUP_BY_ITEMS} ${order}`, [packageOrgId])
}

async function requestAllJobs(req, res, next) {
	try {
		let upgradeJobs = await findJobs(req.query.upgradeId, req.query.itemId, req.query.orgId, req.query.sort_field, req.query.sort_dir);
		return res.json(upgradeJobs);
	} catch (e) {
		next(e);
	}
}

async function fetchRequests(items) {
	const promisesArr = [], results = new Map();
	items.forEach(item => {
		promisesArr.push(push.findRequestsByIds(item.package_org_id, [item.push_request_id], results));
	});

	let pushReqs = [];
	try {
		await Promise.all(promisesArr);
	} catch (e) {
		return logger.error("Failed to fetch upgrade request data", e)
	}

	results.forEach(value => {
		if (value.length === 0)
			return; // Nothing to do.

		pushReqs = pushReqs.concat(value);
	});
	await updateUpgradeItemsFromPushRequests(items, pushReqs);
}

async function fetchJobs(items, upgradeJobs) {
	const promisesArr = [], results = new Map();
	items.forEach(item => {
		promisesArr.push(push.findJobsByRequestIds(item.package_org_id, item.push_request_id, results));
	});

	let pushJobs = [];
	try {
		await Promise.all(promisesArr);
	} catch (e) {
		logger.error("Failed to fetch upgrade job data", e)
	}

	results.forEach(value => {
		if (value.length === 0)
			return; // Nothing to do.

		let pushRequestId = sfdc.normalizeId(value[0].PackagePushRequestId);
		const item = items.find(item => pushRequestId === item.push_request_id);
		value.forEach(pj => pj.item = item);
		pushJobs = pushJobs.concat(value);
	});
	await updateUpgradeJobsFromPushJobs(upgradeJobs, pushJobs);
}

async function findJobs(upgradeId, itemIds, orgIds, sortField, sortDir, status) {
	let values, where;
	if (upgradeId) {
		values = [upgradeId];
		where = " WHERE j.upgrade_id = $1";
	} else if(itemIds) {
		values = Array.isArray(itemIds) ? itemIds : [itemIds];
		where = ` WHERE j.item_id IN (${values.map((v,i) => `$${i+1}`).join(",")})`;
	} else if(orgIds) {
		values = Array.isArray(orgIds) ? orgIds : [orgIds];
		where = ` WHERE j.org_id IN (${values.map((v,i) => `$${i+1}`).join(",")})`;
	} else {
		values = [];
		where = "";
	}

	if (status) {
		values.push(status);
		where += ` AND j.status = $${values.length}`;
		
	}
	let orderBy = ` ORDER BY  ${sortField || "org_id"} ${sortDir || "asc"}`;
	return await db.query(SELECT_ALL_JOBS + where + orderBy, values)
}

function requestById(req, res, next) {
	let id = req.params.id;
	retrieveById(id).then(rec => res.json(rec))
		.catch(next);
}

async function retrieveById(id) {
	let recs = await db.query(SELECT_ONE, [id]);
	if (recs.length === 0)
		throw new Error(`Cannot find any record with id ${id}`);

	return recs[0];
}

function requestItemById(req, res, next) {
	let id = req.params.id;
	retrieveItemById(id)
		.then(async item => {
			res.json(item)
		})
		.catch(next);
}

async function retrieveItemById(id) {
	let where = "WHERE i.id = $1";
	let recs = await db.query(`${SELECT_ONE_ITEM} ${where} ${GROUP_BY_ITEMS}`, [id]);
	return recs[0];
}

function requestJobById(req, res, next) {
	let id = req.params.id;
	let where = " WHERE j.id = $1";
	db.query(SELECT_ALL_JOBS + where, [id])
	.then(recs => recs.length === 0 ? next(new Error(`Cannot find any record with id ${id}`)) : res.json(recs[0]))
	.catch(next);
}

async function requestActivateUpgrade(req, res, next) {
	let id = req.params.id;
	try {
		await activateUpgrade(id, req.session.username);
		return res.send({result: 'ok'});
	} catch (e) {
		next(e);
	}
}

async function requestRetryFailedUpgrade(req, res, next) {
	let id = req.params.id;
	try {
		const upgrade = await push.retryFailedUpgrade(id, req.session.username);
		if (upgrade == null) {
			return next("No failed jobs found to retry");
		}
		
		await activateUpgrade(upgrade.id, null); // Skip passing the username to skip the activation validation check
		return res.json(upgrade);
	} catch(e) {
		logger.error("Failed to rescheduled upgrade", {id, error: e.message || e});
		next(e);
	}
}

async function activateUpgrade(id, username, job = {postMessage: msg => logger.info(msg)}) {
	const upgrade = await retrieveById(id);
	if (upgrade.status !== UpgradeStatus.Ready) {
		throw `Cannot activate an upgrade (${id}) that is not in Ready state`;
	} 
	if (username && process.env.ENFORCE_ACTIVATION_POLICY !== "false") {
		if (upgrade.created_by === null) {
			throw `Cannot activate upgrade ${id} without knowing who created it`;
		}
		if (upgrade.created_by === username) {
			throw `Cannot activate upgrade ${id} by the same user ${username} who created it`;
		}
	}
	
	await activateAvailableUpgradeItems(id, username, job);
	upgrade.status = UpgradeStatus.Active;
	await db.update(`UPDATE upgrade SET status = $1 WHERE id = $2`, [upgrade.status, id]);
	admin.emit(admin.Events.UPGRADE, upgrade);
}

async function activateAvailableUpgradeItems(id, username, job = {postMessage: msg => logger.info(msg)}) {
	let items = await findItemsByUpgrade(id, ["dependency_tier", "package_id", "version_sort"], "asc");
	let incomplete = [];
	items = items.filter(i => {
		if (i.eligible_job_count === 0) {
			changeUpgradeItemStatus([i], push.Status.Ineligible).then(() => {
					logger.warn("Cannot activate an upgrade item with no eligible jobs", {id: i.id, push_request_id: i.push_request_id});
					admin.emit(admin.Events.UPGRADE_ITEMS, [i]);
				}
			).catch(err => 
				logger.error("Failed to mark item as ineligible", {error: err.message || err, id: i.id, push_request_id: i.push_request_id})
			);
			return false;
		} else if (i.job_count !== i.total_job_count) {
			incomplete.push(i);
			return false;
		} else {
			return true;
		}
	});

	if (incomplete.length > 0) {
		let pl = strings.pluralizeIt(incomplete, "upgrade item");
		admin.alert("Cannot activate upgrade", `${pl.num} ${pl.str} are still scheduling jobs.`);
		return items;
	}

	if (items.length === 0) {
		admin.alert("Cannot activate upgrade", `None of the selected orgs are eligible for upgrades.`);
		return items;
	}
	
	// Build our buckets based on tiers
	const buckets = [];
	let bucket = {};
	let tier = null, packageId = null;
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		// If this item is in a new tier, or if the same package is being upgraded again, add a new bucket.
		if (tier !== item.dependency_tier || packageId === item.package_id) {
			tier = item.dependency_tier;
			packageId = item.package_id;
			bucket = {state: State.Ready, items: []};
			buckets.push(bucket);
		}
		// ...and add the item to its new bucket, or the old bucket if it was in the same tier as the prior
		bucket.items.push(item);

		// Now, check the item and set the status for the whole bucket
		switch (item.status) {
			case push.Status.Succeeded:
				bucket.state = State.Complete;
				break;
			case push.Status.Failed:
				bucket.state = State.Complete;
				break;
			case push.Status.Pending:
			case push.Status.InProgress:
				bucket.state = State.Running;
				break;
			case push.Status.Canceled:
				bucket.state = State.Complete;
				break;
			default:
				break;
		}
	}

	// Now we know our tier buckets with their collective status, so loop through them and activate any that are ready.
	for (let b = 0; b < buckets.length; b++) {
		const items = buckets[b].items;
		
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			let activate = false;
			if (b === 0) {
				// First tier, so no parent to wait for.
				activate = true;
			} else {
				// We are not the first tier, so we have to check our previous tier before activating.
				const parentBucket = buckets[b - 1];
				if (parentBucket.state === State.Complete) {
					// Yay! Parent is done so we can start.
					activate = true;
				}
			}

			if (activate && item.status === push.Status.Created) {
				// Ready to activate!
				try {
					await push.updatePushRequests([item], push.Status.Pending, username);
					await changeUpgradeJobStatus([item], push.Status.Pending);
					await changeUpgradeItemStatus([item], push.Status.Pending);
					admin.emit(admin.Events.UPGRADE, await retrieveById(item.upgrade_id));
					admin.emit(admin.Events.UPGRADE_ITEMS, [item]);
					job.postMessage(`Activated item ${item.id} for ${item.package_name} ${item.version_number}`);
				} catch (e) {
					logger.error("Failed to activate", {error: e.message || e});
                    admin.alert("Failed to activate", e.message || e);
                }
			}
		}
	}
	return items;
}

function monitorUpgrades() {
	const job = new admin.AdminJob(
		admin.JobTypes.UPGRADE, "Run and monitor active upgrades",
		[
			{
				name: "Monitor active upgrades",
				handler: job => monitorActiveUpgrades(job)
			},
			{
				name: "Monitor active upgrade items",
				handler: job => monitorActiveUpgradeItems(job)
			},
			{
				name: "Monitor active upgrade jobs",
				handler: job => monitorActiveUpgradeJobs(job)
			}
		]);
	job.singleton = true; // Don't queue us up
	job.timeout = 5 * 60 * 1000; // Lower, 5 minute timeout.
	job.shouldRun = async () => await areAnyUpgradesUnfinished();
	return job;
}

async function retrieveActiveUpgrades() {
	let i = 0;
	return db.query(`${SELECT_ALL} WHERE u.status IN ($${++i}) AND u.start_time <= NOW() ${GROUP_BY_ALL}`, [UpgradeStatus.Active]);
}

async function monitorActiveUpgrades(job) {
	const activeUpgrades = await retrieveActiveUpgrades();
	for (let i = 0; i < activeUpgrades.length; i++) {
		const upgrade = activeUpgrades[i];
		await activateAvailableUpgradeItems(upgrade.id, job);
		
		if (await areJobsCompleteForUpgrade(upgrade.id)) {
			// An upgrade is complete only when all of its jobs are marked as complete
			upgrade.status = UpgradeStatus.Done;
			await db.update(`UPDATE upgrade SET status = $1 WHERE id = $2`, [upgrade.status, upgrade.id]);
			admin.emit(admin.Events.UPGRADE, upgrade);
		}
	}
}

async function monitorActiveUpgradeItems(job) {
	let i = 0;
	const activeItems = await db.query(`${SELECT_ALL_ITEMS} WHERE i.status IN ($${++i},$${++i}) AND i.start_time <= NOW() ${GROUP_BY_ITEMS}`,
		[push.Status.Pending, push.Status.InProgress]);
	if (activeItems.length === 0) {
		return; // Nothing to do
	}
	
	await fetchRequests(activeItems);
}

async function monitorActiveUpgradeJobs(job) {
	let i = 0;
	const activeItems = await db.query(
		`${SELECT_ITEMS_WITH_JOBS} WHERE 
		(j.status IN ($${++i},$${++i}) OR j.status = $${++i} AND i.status = $${++i}) 
			AND i.start_time <= NOW()`,
		[push.Status.Pending, push.Status.InProgress, push.Status.Created, push.Status.Canceled]);
	if (activeItems.length === 0)
		return; // Nothing to do

	const upgradeJobs = await findJobs(null, activeItems.map(item => item.id));
	await fetchJobs(activeItems, upgradeJobs);
}


async function areAnyUpgradesUnfinished() {
	const activeJobs = await db.query(`SELECT j.id FROM upgrade_job j 
										INNER JOIN upgrade u on u.id = j.upgrade_id
										INNER JOIN upgrade_item i on i.id = j.item_id
										WHERE u.start_time <= NOW() AND (u.status = $1 
											OR i.status IN ($2,$3,$4) OR j.status IN ($2,$3,$4)
										) LIMIT 1`,
		[UpgradeStatus.Active, push.Status.Created, push.Status.Pending, push.Status.InProgress], true);
	return activeJobs.length === 1;
}

async function areJobsCompleteForUpgrade(upgradeId) {
	let i = 0;
	const jobs = await db.query(`SELECT id FROM upgrade_job WHERE upgrade_id = $${++i} 
								AND status IN ($${++i}, $${++i}, $${++i}) LIMIT 1`,
		[upgradeId, push.Status.Created, push.Status.Pending, push.Status.InProgress]);
	return jobs.length === 0;
}

async function requestCancelUpgrade(req, res, next) {
	const id = req.params.id;
	const comment = req.body.comment;
	try {
		let items = await findItemsByUpgrade(id);
		await push.updatePushRequests(items, push.Status.Canceled, req.session.username);
		await changeUpgradeJobStatus(items, push.Status.Canceled, push.Status.Pending, push.Status.Created);
		await changeUpgradeItemStatus(items, push.Status.Canceled);
		await db.update(`UPDATE upgrade SET status = $1, comment = $2 WHERE id = $3`, [UpgradeStatus.Canceled, comment, id]);
		admin.emit(admin.Events.UPGRADE, await retrieveById(id));
		admin.emit(admin.Events.UPGRADE_ITEMS, items);
		res.json(items);
	} catch (e) {
		next(e);
	}
}

async function requestPurge(req, res, next) {
	try {
		let ids = req.body.upgradeIds;
		let n = 1;
		let params = ids.map(() => `$${n++}`);
		await db.delete(`DELETE FROM upgrade_job WHERE upgrade_id IN (${params.join(",")})`, ids);
		await db.delete(`DELETE FROM upgrade_item WHERE upgrade_id IN (${params.join(",")})`, ids);
		await db.delete(`DELETE FROM upgrade WHERE id IN (${params.join(",")})`, ids);
		admin.emit(admin.Events.UPGRADES);
		return res.send({result: 'ok'});
	} catch (e) {
		next(e);
	}
}

async function requestActivateUpgradeItem(req, res, next) {
	const id = req.params.id;
	try {
		const item = (await findItemsByIds([id]))[0];
		if (item.eligible_job_count === 0) {
			changeUpgradeItemStatus([item], push.Status.Ineligible).then(() => {
					logger.warn("Cannot activate an upgrade item with no eligible jobs", {id: item.id, push_request_id: item.push_request_id});
					admin.emit(admin.Events.UPGRADE_ITEMS, [item]);
				}
			).catch(err =>
				logger.error("Failed to mark item as ineligible", {error: err.message || err, id: item.id, push_request_id: item.push_request_id}));
			return res.json({});
		}
		await push.updatePushRequests([item], push.Status.Pending, req.session.username);
		await changeUpgradeJobStatus([item], push.Status.Pending);
		await changeUpgradeItemStatus([item], push.Status.Pending);
		admin.emit(admin.Events.UPGRADE, await retrieveById(item.upgrade_id));
		admin.emit(admin.Events.UPGRADE_ITEMS, [item]);
		res.json(item);
	} catch (e) {
		next(e);
	}
}

async function requestCancelUpgradeItem(req, res, next) {
	const id = req.params.id;
	try {
		let item = (await findItemsByIds([id]))[0];
		await push.updatePushRequests([item], push.Status.Canceled, req.session.username);
		await changeUpgradeJobStatus([item], push.Status.Canceled, push.Status.Pending);
		await changeUpgradeItemStatus([item], push.Status.Canceled);
		admin.emit(admin.Events.UPGRADE, await retrieveById(item.upgrade_id));
		admin.emit(admin.Events.UPGRADE_ITEMS, [item]);
		res.json(item);
	} catch (e) {
		next(e);
	}
}

async function requestRefreshUpgrade(req, res, next) {
	const id = req.params.id;
	try {
		const items = await findItemsByUpgrade(id);
		fetchRequests(items).then(() => {}).catch(next);

		const upgradeJobs = await findJobs(id);
		fetchJobs(items, upgradeJobs).then(() =>
			admin.emit(admin.Events.UPGRADE_JOBS, id)).catch(next);
		res.json({result: "OK"});
	} catch (e) {
		next(e);
	}
}

async function requestRefreshUpgradeItem(req, res, next) {
	const id = req.params.id;
	try {
		const items = await findItemsByIds([id]).catch(next);
		fetchRequests(items).then(() => {}).catch(next);

		const upgradeJobs = await findJobs(null, [id]);
		fetchJobs(items, upgradeJobs).then(() =>
			admin.emit(admin.Events.UPGRADE_JOBS, id));
		res.json({result: "OK"});
	} catch (e) {
		next(e);
	}
}

async function cancelAllRequests() {
	let orgs = await db.query(`SELECT org_id FROM package_org WHERE namespace is not null`);
	await push.clearRequests(orgs.map(o => o.org_id));
}

exports.cancelAllRequests = cancelAllRequests;
exports.requestById = requestById;
exports.retrieveById = retrieveById;
exports.requestItemById = requestItemById;
exports.requestJobById = requestJobById;
exports.requestAll = requestAll;
exports.requestItems = requestItems;
exports.requestAllJobs = requestAllJobs;
exports.createUpgrade = createUpgrade;
exports.failUpgrade = failUpgrade;
exports.createUpgradeItem = createUpgradeItem;
exports.createJobs = createJobs;
exports.requestActivateUpgrade = requestActivateUpgrade;
exports.requestCancelUpgrade = requestCancelUpgrade;
exports.requestRetryFailedUpgrade = requestRetryFailedUpgrade;
exports.requestPurge = requestPurge;
exports.requestActivateUpgradeItem = requestActivateUpgradeItem;
exports.requestCancelUpgradeItem = requestCancelUpgradeItem;
exports.requestRefreshUpgrade = requestRefreshUpgrade;
exports.requestRefreshUpgradeItem = requestRefreshUpgradeItem;
exports.changeUpgradeItemTotalJobCount = changeUpgradeItemTotalJobCount;
exports.findItemsByIds = findItemsByIds;
exports.findJobs = findJobs;
exports.monitorUpgrades = monitorUpgrades;