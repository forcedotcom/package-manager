const db = require('../util/pghelper');
const push = require('../worker/packagepush');
const admin = require('./admin');
const logger = require('../util/logger').logger;

const State = {
	Ready: "Ready",
	Blocked: "Blocked",
	Running: "Running",
	Partial: "Partial",
	Complete: "Complete"
};

const UPGRADE_MONITOR_FREQUENCY = (process.env.UPGRADE_MONITOR_FREQUENCY_SECONDS || 10) * 1000;

const MAX_ERROR_COUNT = 20;

const SELECT_ALL = `
    SELECT u.id, u.start_time, u.created_by, u.description,
    CASE
    WHEN count(CASE
             WHEN i.status = 'Created' THEN 1
             ELSE NULL END) = count(i.*) THEN 'Inactive'
    WHEN count(CASE
             WHEN i.status = 'Succeeded' THEN 1
             WHEN i.status = 'Failed' THEN 1
             WHEN i.status = 'Canceled' THEN 1
             WHEN i.status = 'Ineligible' THEN 1
             ELSE NULL END) != count(i.*) THEN 'Active'
    ELSE 'Done' END status
    FROM upgrade u
    INNER JOIN upgrade_item i ON i.upgrade_id = u.id
    GROUP BY u.id, u.start_time, u.created_by, u.description`;

const SELECT_ONE = `
    SELECT u.id, u.start_time, u.created_by, u.description,
    CASE
    WHEN count(CASE
             WHEN i.status = 'Created' THEN 1
             ELSE NULL END) = count(i.*) THEN 'Inactive'
    WHEN count(CASE
             WHEN i.status = 'Succeeded' THEN 1
             WHEN i.status = 'Failed' THEN 1
             WHEN i.status = 'Canceled' THEN 1
             WHEN i.status = 'Ineligible' THEN 1
             ELSE NULL END) != count(i.*) THEN 'Active'
    ELSE 'Done' END status
    FROM upgrade u
    INNER JOIN upgrade_item i ON i.upgrade_id = u.id
    WHERE u.id = $1
    GROUP by u.id, u.start_time, u.created_by, u.description`;

const SELECT_ALL_ITEMS = `SELECT i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, i.status, i.created_by,
        u.description,
        pv.version_number, pv.version_id,
        p.name package_name, p.sfid package_id, p.dependency_tier,
        count(j.*) job_count, 
        count(NULLIF(j.status, 'Ineligible')) eligible_job_count,
	  	count(CASE
			WHEN j.status = 'Failed' THEN 1
			ELSE NULL END) failed_job_count
        FROM upgrade_item i
        inner join upgrade u on u.id = i.upgrade_id
        inner join package_version pv on pv.version_id = i.package_version_id
        inner join package p on p.sfid = pv.package_id
        left join upgrade_job j on j.item_id = i.id`;

const GROUP_BY_ALL_ITEMS = ` group by i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, i.status,
        u.description,
        pv.version_number, pv.version_id,
        p.name, p.sfid`;

const SELECT_ALL_ITEMS_BY_UPGRADE =
	`${SELECT_ALL_ITEMS}
        where i.upgrade_id = $1
        ${GROUP_BY_ALL_ITEMS}`;

const SELECT_ONE_ITEM = `SELECT i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, i.status, i.created_by,
        u.description,
        pv.version_number, pv.version_id,
        p.name package_name, p.dependency_tier
        FROM upgrade_item i
        INNER JOIN upgrade u on u.id = i.upgrade_id
        INNER JOIN package_version pv on pv.version_id = i.package_version_id
        INNER JOIN package p on p.sfid = pv.package_id`;

const SELECT_ALL_JOBS = `SELECT j.id, j.upgrade_id, j.push_request_id, j.job_id, j.org_id, j.status, j.message,
        i.start_time, i.created_by,
        pv.version_number, pv.version_id,
        pvc.version_number current_version_number, pvc.version_id current_version_id,
        pvo.version_number original_version_number, pvo.version_id original_version_id,
        p.name package_name, p.sfid package_id, p.package_org_id, p.dependency_tier,
        a.account_name
        FROM upgrade_job j
        INNER JOIN upgrade_item i on i.push_request_id = j.push_request_id
        INNER JOIN package_version pv on pv.version_id = i.package_version_id
        INNER JOIN org_package_version opv on opv.package_id = pv.package_id AND opv.org_id = j.org_id
        INNER JOIN package_version pvc on pvc.sfid = opv.package_version_id
        INNER JOIN package_version pvo on pvo.sfid = j.original_version_id
        INNER JOIN package p on p.sfid = pv.package_id
        INNER JOIN org o on o.org_id = j.org_id
        INNER JOIN account a ON a.account_id = o.account_id`;

async function createUpgrade(scheduledDate, createdBy, description) {
	let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
	let recs = await db.insert('INSERT INTO upgrade (start_time,created_by,description) VALUES ($1,$2,$3)', [isoTime, createdBy, description]);
	return recs[0];
}

async function createUpgradeItem(upgradeId, requestId, packageOrgId, versionId, scheduledDate, status, createdBy) {
	let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
	let recs = await db.insert('INSERT INTO upgrade_item' +
		' (upgrade_id, push_request_id, package_org_id, package_version_id, start_time, status, created_by)' +
		' VALUES ($1,$2,$3,$4,$5,$6,$7)',
		[upgradeId, requestId, packageOrgId, versionId, isoTime, status, createdBy]);
	return recs[0];
}

async function changeUpgradeItemStatus(item, status) {
	try {
		item.status = status || item.status;
		await db.update(`UPDATE upgrade_item SET status = $1 WHERE id = $2`, [item.status, item.id]);
	} catch (error) {
		logger.error("Failed to update upgrade item", {itemId: item.id, status, error: error.message || error});
	}
}

async function changeUpgradeItemAndJobStatus(items, status) {
	try {
		const values = [status];
		const params = [];
		for (let i = 0, p = values.length+1; i < items.length; i++) {
			items[i].status = status;
			values.push(items[i].id);
			params.push(`$${p++}`);
		}
		
		await db.update(`UPDATE upgrade_item SET status = $1 WHERE id IN (${params.join(",")})`, values);
		await db.update(`UPDATE upgrade_job SET status = $1 WHERE item_id IN (${params.join(",")})`, values);
	} catch (error) {
		logger.error("Failed to update upgrade items", {status, error: error.message || error});
	}
}

async function handleUpgradeJobsStatusChange(pushJobs, upgradeJobs) {
	if (pushJobs.length > upgradeJobs.length) {
		// Should never ever happen.
		logger.error("Fail: pushJobs does not match upgradeJobs", {
			pushjobs: pushJobs.length,
			upgradejobs: upgradeJobs.length
		});
		return {};
	}

	// Order by org id
	pushJobs.sort(function (a, b) {
		return a.SubscriberOrganizationKey > b.SubscriberOrganizationKey ? 1 : -1;
	});

	upgradeJobs.sort(function (a, b) {
		return a.org_id > b.org_id ? 1 : -1;
	});

	let updated = [];
	let upgraded = [];
	let errored = [];
	for (let u = 0, p = 0; u < upgradeJobs.length; u++) {
		let upgradeJob = upgradeJobs[u];
		if (upgradeJob.job_id === null) {
			if (upgradeJob.status !== push.Status.Invalid) {
				// New status, so update our local copy.
				upgradeJob.status = push.Status.Invalid;
				upgradeJob.message = "No matching push upgrade job found.";
				updated.push(upgradeJob);
			}
			continue; // Ignore the ineligible or otherwise invalid job
		}

		const pushJob = pushJobs[p++]; // Increment push job counter here, and not before

		if (pushJob.Id.substring(0, 15) !== upgradeJob.job_id) {
			throw Error("Something is very wrong. Push Jobs do not match Upgrade Jobs");
		}
		if (pushJob.Status === push.Status.Succeeded) {
			// Our upgrade finished, we are told.
			if (upgradeJob.version_id !== upgradeJob.current_version_id) {
				// ...but our local version information does not yet match.  Fetch it.
				upgraded.push(upgradeJob);
			}
		}

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
				errors.push({
					title: "Unknown failure",
					details: "",
					message: "Unknown failure. No error message given from push upgrade API."
				});
			}

			erroredJob.message = JSON.stringify(errors);
			erroredJob.status = push.Status.Failed;
		}
	}

	if (updated.length > 0) {
		await upsertUpgradeJobs(null, null, null, updated);
	}

	if (upgraded.length > 0) {
		await admin.fetchVersions(upgraded.map(j => j.org_id), [upgraded[0].package_org_id]);
	}

	return {updated: updated.length, succeeded: upgraded.length, errored: errored.length};
}

async function upsertUpgradeJobs(upgradeId, itemId, requestId, jobs) {
	let sql = `INSERT INTO upgrade_job (upgrade_id, item_id, push_request_id, job_id, org_id, status, message, original_version_id) VALUES`;
	let values = [upgradeId, itemId, requestId];
	for (let i = 0, n = 1 + values.length; i < jobs.length; i++) {
		const job = jobs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($1,$2,$3,$${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(job.job_id, job.org_id, job.status, job.message, job.original_version_id);
	}

	sql += `on conflict (job_id) do update set status = excluded.status, message = excluded.message`;
	await db.insert(sql, values);
}

async function requestAll(req, res, next) {
	try {
		let upgrades = await findAll(req.query.sort_field, req.query.sort_dir);
		return res.json(upgrades);
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

async function findAll(sortField, sortDir) {
	let orderBy = ` ORDER BY ${sortField || "start_time"} ${sortDir || "asc"}`;
	return await db.query(SELECT_ALL + orderBy, [])
}

async function requestItemsByUpgrade(req, res, next) {
	try {
		let items = await findItemsByUpgrade(req.query.upgradeId, req.query.sort_field, req.query.sort_dir);
		if (req.query.fetchStatus) {
			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let pushReqs = await push.findRequestsByIds(item.package_org_id, [item.push_request_id]);
				await changeUpgradeItemStatus(item, pushReqs[0].Status);
			}
		}

		return res.json(items);
	} catch (e) {
		return res.status(500).send(e.message || e);
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

	const where = ` WHERE ${whereParts.join(" AND")}`;
	const order = ` ORDER BY dependency_tier`;
	return await db.query(SELECT_ALL_ITEMS + where + GROUP_BY_ALL_ITEMS + order, values)
}

async function findItemsByUpgrade(upgradeId, sortField, sortDir) {
	let orderBy = ` ORDER BY  ${sortField || "push_request_id"} ${sortDir || "asc"}`;
	return await db.query(SELECT_ALL_ITEMS_BY_UPGRADE + orderBy, [upgradeId])
}

async function requestAllJobs(req, res, next) {
	try {
		let upgradeJobs = await findJobs(req.query.upgradeId, req.query.itemId, req.query.sort_field, req.query.sort_dir);
		if (req.query.fetchStatus && upgradeJobs.length > 0) {
			let pushJobs = await fetchJobStatus(upgradeJobs);
			handleUpgradeJobsStatusChange(pushJobs, upgradeJobs)
				.then(({updated, succeeded, errored}) => logger.debug(`Upgrade job status changes`, {
					updated,
					succeeded,
					errored
				}))
				.catch(error => logger.error('Failed to update upgrade item status', {error: error.message || error}));
		}

		return res.json(upgradeJobs);
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

async function fetchJobStatus(upgradeJobs) {
	const requestMap = new Map();
	upgradeJobs.forEach(j => {
		requestMap.set(j.push_request_id, {package_org_id: j.package_org_id, push_request_id: j.push_request_id});
	});
	const promisesArr = [];
	Array.from(requestMap.values()).forEach(r => {
		promisesArr.push(push.findJobsByRequestIds(r.package_org_id, r.push_request_id));
	});
	const promisesResults = await Promise.all(promisesArr);
	let pushJobs = [];
	promisesResults.forEach(arr => pushJobs = pushJobs.concat(arr));
	return pushJobs;
}

async function findJobs(upgradeId, itemId, sortField, sortDir, status) {
	let where = upgradeId ? " WHERE j.upgrade_id = $1" : itemId ? " WHERE j.item_id = $1" : "";
	let values = [upgradeId || itemId];
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
	return recs[0];
}

function requestItemById(req, res, next) {
	let id = req.params.id;
	retrieveItemById(id)
		.then(async item => {
			if (req.query.fetchStatus) {
				let pushReqs = await push.findRequestsByIds(item.package_org_id, [item.push_request_id]);
				await changeUpgradeItemStatus(item, pushReqs[0].Status);
			}
			res.json(item)
		})
		.catch(next);
}

async function retrieveItemById(id) {
	let where = " WHERE i.id = $1";
	let recs = await db.query(SELECT_ONE_ITEM + where, [id]);
	return recs[0];
}

function requestJobById(req, res, next) {
	let id = req.params.id;
	let where = " WHERE j.id = $1";
	db.query(SELECT_ALL_JOBS + where, [id])
		.then(function (recs) {
			return res.json(recs[0]);
		})
		.catch(next);
}

async function requestActivateUpgrade(req, res, next) {
	let id = req.params.id;
	try {
		const items = await activateUpgrade(id, req.session.username);
		startUpgradeMonitor(id, req.session.username);
		res.json(items);
	} catch (e) {
		return res.status(500).send(e.message || e);
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
	let items = await findItemsByUpgrade(id, "dependency_tier", "asc");
	items = items.filter(i => {
		if (i.eligible_job_count === "0") {
			logger.warn("Cannot activate an upgrade item with no eligible jobs", {
				id: i.id,
				push_request_id: i.push_request_id
			});
			return false;
		} else {
			return true;
		}
	});

	if (items.length === 0) {
		// Nothing to do, leave now.
		return items;
	}
	
	// Build our buckets based on tiers (or biers if that is your thing)
	const buckets = [];
	let bucket = {};
	let tier = null;
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (item.dependency_tier == null) {
			// No dependencies, just activate and be done (if not already activated)
			if (item.status === push.Status.Created) {
				await push.updatePushRequests([item], push.Status.Pending, username);
				await changeUpgradeItemAndJobStatus([item], push.Status.Pending);
				job.postMessage(`Activated item ${item.id} for ${item.package_name}`);
			}
			continue;
		}

		// If this item is in a new tier, add a new bucket.
		if (tier !== item.dependency_tier) {
			tier = item.dependency_tier;
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
				bucket.state = State.Complete; // TODO State.Blocked if over failure threshold
				break;
			case push.Status.Pending:
			case push.Status.InProgress:
				bucket.state = State.Running;
				break;
			case push.Status.Canceled:
				bucket.state = State.Blocked;
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
				await push.updatePushRequests([item], push.Status.Pending, username);
				await changeUpgradeItemAndJobStatus([item], push.Status.Pending);
				job.postMessage(`Activated item ${item.id} for ${item.package_name}`);
			}
		}
	}
	return items;
}

function startUpgradeMonitor(id, username) {
	const job = new admin.AdminJob("upgrade", "Run and monitor an active upgrade",
		[
			{
				name: "Activate and monitor requests in upgrade",
				handler: async (job) => activateAndMonitorUpgrade(id, username, job)
			}
		]);
	job.run().then(() => {});
}

async function activateAndMonitorUpgrade(id, username, job) {
	return new Promise((resolve, reject) => {
		const repeatAsNeeded = () => {
			// Keep activating the upgrade until the items are done.
			activateUpgrade(id, username, job).then((items) => {
				logger.info("Finished upgrade activation run");
				let active = false;
				for (let i = 0; i < items.length; i++) {
					if (push.isActiveStatus(items[i].status)) {
						// If one request is still active, we're still active.
						active = true;
					}
				}

				if (!active) {
					resolve(items);
				} else {
					setTimeout(repeatAsNeeded, UPGRADE_MONITOR_FREQUENCY);
				}
			}).catch(reject);
		};
		repeatAsNeeded();
	});
}


async function requestCancelUpgrade(req, res, next) {
	const id = req.params.id;
	try {
		let items = await findItemsByUpgrade(id);
		await push.updatePushRequests(items, push.Status.Canceled, req.session.username);
		await changeUpgradeItemAndJobStatus(items, push.Status.Canceled);
		res.json(items);
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

async function requestActivateUpgradeItem(req, res, next) {
	const id = req.params.id;
	try {
		const item = (await findItemsByIds([id]))[0];
		if (item.eligible_job_count === "0") {
			logger.warn("Cannot activate an upgrade item with no eligible jobs", {itemId: item.id});
			return res.json({});
		}
		await push.updatePushRequests([item], push.Status.Pending, req.session.username);
		await changeUpgradeItemAndJobStatus([item], push.Status.Pending);
		res.json(item);
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

async function requestCancelUpgradeItem(req, res, next) {
	const id = req.params.id;
	try {
		let item = (await findItemsByIds([id]))[0];
		await push.updatePushRequests([item], push.Status.Canceled, req.session.username);
		await changeUpgradeItemAndJobStatus([item], push.Status.Canceled);
		res.json(item);
	} catch (e) {
		return res.status(500).send(e.message || e);
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
exports.requestItemsByUpgrade = requestItemsByUpgrade;
exports.requestAllJobs = requestAllJobs;
exports.createUpgrade = createUpgrade;
exports.createUpgradeItem = createUpgradeItem;
exports.createUpgradeJobs = upsertUpgradeJobs;
exports.requestActivateUpgrade = requestActivateUpgrade;
exports.requestCancelUpgrade = requestCancelUpgrade;
exports.requestRetryFailedUpgrade = requestRetryFailedUpgrade;
exports.requestActivateUpgradeItem = requestActivateUpgradeItem;
exports.requestCancelUpgradeItem = requestCancelUpgradeItem;
exports.findItemsByIds = findItemsByIds;
exports.findJobs = findJobs;
