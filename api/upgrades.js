const db = require('../util/pghelper');
const push = require('../worker/packagepush');
const orgs = require('./orgs');
const logger = require('../util/logger').logger;

const SELECT_ALL = `select u.id, u.start_time, u.created_by, u.description, count(i.*) item_count
                    from upgrade u
                    inner join upgrade_item i on i.upgrade_id = u.id
                    group by u.id, u.start_time, u.created_by, u.description`;

const SELECT_ONE = `select u.id, u.start_time, u.created_by, u.description, count(i.*) item_count
                    from upgrade u
                    inner join upgrade_item i on i.upgrade_id = u.id
                    where u.id = $1
                    group by u.id, u.start_time, u.created_by, u.description`;

const SELECT_ALL_ITEMS = `SELECT i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, i.status, i.created_by,
        u.description,
        pv.version_number, pv.version_id,
        p.name package_name, p.sfid package_id,
        count(j.*) job_count, count(NULLIF(j.status, 'Ineligible')) eligible_job_count
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
        p.name package_name
        FROM upgrade_item i
        INNER JOIN upgrade u on u.id = i.upgrade_id
        INNER JOIN package_version pv on pv.version_id = i.package_version_id
        INNER JOIN package p on p.sfid = pv.package_id`;

const SELECT_ALL_JOBS = `SELECT j.id, j.upgrade_id, j.push_request_id, j.job_id, j.org_id, j.status, j.message,
        i.start_time, i.created_by,
        pv.version_number, pv.version_id,
        p.name package_name, p.sfid package_id, p.package_org_id,
        a.account_name
        FROM upgrade_job j
        INNER JOIN upgrade_item i on i.push_request_id = j.push_request_id
        INNER JOIN package_version pv on pv.version_id = i.package_version_id
        INNER JOIN package p on p.sfid = pv.package_id
        INNER JOIN org o on o.org_id = j.org_id
        INNER JOIN account a ON a.account_id = o.account_id`;

async function createUpgrade(scheduledDate, createdBy, description) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let recs = await db.insert('INSERT INTO upgrade (start_time,created_by,description) VALUES ($1,$2,$3)', [isoTime,createdBy,description]);
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

async function handleUpgradeItemStatusChange(item, newStatus) {
    if (item.status !== newStatus) {
        item.status = newStatus;
        try {
            await db.update('UPDATE upgrade_item SET status = $1 WHERE id = $2', [item.status, item.id]);
            logger.debug(`Upgrade item status changed`, {id: item.id, status: item.status});
        } catch (error) {
            logger.error("Failed to update upgrade item status", error);
        }
    }
}

async function handleUpgradeJobsStatusChange(pushJobs, upgradeJobs) {
    if (pushJobs.length > upgradeJobs.length) {
        // Should never ever happen.
        logger.error("Fail: pushJobs does not match upgradeJobs", {pushjobs: pushJobs.length, upgradejobs: upgradeJobs.length});
        return {};
    }
    
    // Assumption: pushJobs is already ordered by Id
    upgradeJobs.sort(function(a, b) {
        return a.job_id > b.job_id ? 1 : -1;
    });
    
    let updated = [];
    let upgraded = [];
    let errored = [];
    let completed = 0;
    for (let u = 0, p = 0; u < upgradeJobs.length; u++) {
        let upgradeJob = upgradeJobs[u];
        if (upgradeJob.status === push.Status.Ineligible)
            continue; // Ignore the ineligible.
        
        const pushJob = pushJobs[p++]; // Increment push job counter here, and not before
        if (pushJob.Status === upgradeJob.status) 
            continue; // no changes, move along
        
        const isDone = !push.isActiveStatus(pushJob.status);
        if (pushJob.status === push.Status.Failed) {
            // Special handling for errored, below.
            errored.push(upgradeJob);
        } else {
            upgradeJob.status = pushJob.Status;
            if (isDone) {
                // Nor errors, so we assume complete
                upgraded.push(upgradeJob);
            }
        }
        updated.push(upgradeJob);
        completed += isDone ? 1 : 0;
    }

    if (errored.length > 0) {
        let errorJobIds = errored.map(j => j.job_id);
        let pushErrors = await push.findErrorsByJobIds(errored[0].package_org_id, errorJobIds);
        if (pushErrors.length !== errored.length) {
            // Should never ever happen.
            logger.error("Fail: pushErrors does not match errored", {pusherrors: pushErrors.length, errored: errored.length});
            return {};
        }
        
        for (let i = 0; i < errored.length; i++) {
            let err = pushErrors[i];
            errored[i].message = err.ErrorMessage;
            errored[i].status = push.Status.Failed;
        }
    }
    
    if (updated.length > 0) {
        await upsertUpgradeJobs(null, null, null, updated);
    }
    
    if (upgraded.length > 0) {
        await orgs.refreshOrgPackageVersions(upgraded[0].package_org_id, upgraded.map(j => j.org_id));
    }
    return {complete: completed, remaining: pushJobs.length - completed};
}

async function upsertUpgradeJobs(upgradeId, itemId, requestId, jobs) {
    let sql = `INSERT INTO upgrade_job (upgrade_id, item_id, push_request_id, job_id, org_id, status, message) VALUES`;
    let values = [upgradeId, itemId, requestId]; 
    for (let i = 0, n = 1 + values.length; i < jobs.length; i++) {
        const job = jobs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($1,$2,$3,$${n++},$${n++},$${n++},$${n++})`;
        values.push(job.job_id, job.org_id, job.status, job.message);
    }

    sql += `on conflict (job_id) do update set status = excluded.status, message = excluded.message`;
    await db.insert(sql, values);
}

async function requestAll(req, res, next) {
    try {
        let upgrades = await findAll(req.query.sort_field, req.query.sort_dir);
        return res.json(upgrades);
    } catch (err) {
        next(err);
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
                await handleUpgradeItemStatusChange(item, pushReqs[0].Status);
            }
        }

        return res.json(items);
    } catch (err) {
        next(err);
    }
}

async function findItemsByIds(itemIds) {
    let whereParts = [];
    let values = [];
    if (itemIds) {
        let params = [];
        for(let i = 1; i <= itemIds.length; i++) {
            params.push('$' + i);
        }
        whereParts.push(`i.id IN (${params.join(",")})`);
        values = values.concat(itemIds);
    }
    
    let where = ` WHERE ${whereParts.join(" AND" )}`;
    return await db.query(SELECT_ALL_ITEMS + where + GROUP_BY_ALL_ITEMS, values)
}

async function findItemsByUpgrade(upgradeId, sortField, sortDir) {
    let orderBy = ` ORDER BY  ${sortField || "push_request_id"} ${sortDir || "asc"}`;
    return await db.query(SELECT_ALL_ITEMS_BY_UPGRADE + orderBy, [upgradeId])
}

async function requestAllJobs(req, res, next) {
    try {
        let upgradeJobs = await findJobs(req.query.itemId, req.query.sort_field, req.query.sort_dir);
        if (req.query.fetchStatus && upgradeJobs.length > 0) {
            let pushJobs = await push.findJobsByRequestIds(upgradeJobs[0].package_org_id, [upgradeJobs[0].push_request_id]);
            handleUpgradeJobsStatusChange(pushJobs, upgradeJobs)
                .then(({complete, remaining}) => logger.debug(`Upgrade job status changes`, {complete, remaining}))
                .catch(error => logger.error('Failed to update upgrade item status', error));
        }
        
        return res.json(upgradeJobs);
    } catch (err) {
        next(err);
    }
}

async function findJobs(itemId, sortField, sortDir) {
    let where = itemId ? " WHERE j.item_id = $1" : "";
    let orderBy = ` ORDER BY  ${sortField || "item_id"} ${sortDir || "asc"}`;
    return await db.query(SELECT_ALL_JOBS + where + orderBy, [itemId])
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
                await handleUpgradeItemStatusChange(item, pushReqs[0].Status);
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

async function requestActivateUpgradeItems(req, res, next) {
    const ids = req.body.items;
    try {
        let items = await findItemsByIds(ids);
        items = items.filter(i => {
            if (i.eligible_job_count === "0") {
                logger.warn("Cannot activate an upgrade item with no eligible jobs", {id: i.id, push_request_id: i.push_request_id});
                return false;
            } else {
                return true;
            }
        });
        if (items.length > 0) {
            await push.updatePushRequests(items, push.Status.Pending, req.session.username);
            for (let i = 0; i < items.length; i++) {
                if (items[i].status !== push.Status.Pending) {
                    items[i].status = push.Status.Activating;
                }
            }
        }
        res.json(items);
    } catch (err) {
        next(err);
    }
}

async function requestCancelUpgradeItems(req, res, next) {
    const ids = req.body.items;
    try {
        let items = await findItemsByIds(ids);
        await push.updatePushRequests(items, push.Status.Canceled, req.session.username);
        for (let i = 0; i < items.length; i++) {
            if (items[i].status !== push.Status.Canceled) {
                items[i].status = push.Status.Canceling;
            }
        }
        res.json(items);
    } catch (err) {
        next(err);
    }
}

async function cancelAllRequests() {
    let orgs = await db.query(`SELECT org_id FROM package_org WHERE namespace is not null`);
    await push.clearRequests(orgs.map(o => o.org_id));
}

exports.cancelAllRequests = cancelAllRequests;
exports.requestById = requestById;
exports.requestItemById = requestItemById;
exports.requestJobById = requestJobById;
exports.requestAll = requestAll;
exports.requestItemsByUpgrade = requestItemsByUpgrade;
exports.requestAllJobs = requestAllJobs;
exports.createUpgrade = createUpgrade;
exports.createUpgradeItem = createUpgradeItem;
exports.createUpgradeJobs = upsertUpgradeJobs;
exports.requestActivateUpgradeItems = requestActivateUpgradeItems;
exports.requestCancelUpgradeItems = requestCancelUpgradeItems;
exports.findItemsByIds = findItemsByIds;
