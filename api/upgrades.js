const db = require('../util/pghelper');
const push = require('../worker/packagepush');
const licensefetch = require('../worker/licensefetch');


const SELECT_ALL = `select u.id, u.start_time, u.description, count(i.*) item_count
                    from upgrade u
                    inner join upgrade_item i on i.upgrade_id = u.id
                    group by u.id, u.start_time, u.description`;

const SELECT_ONE = `select u.id, u.start_time, u.description, count(i.*) item_count
                    from upgrade u
                    inner join upgrade_item i on i.upgrade_id = u.id
                    where u.id = $1
                    group by u.id, u.start_time, u.description`;

const SELECT_ALL_ITEMS = `SELECT i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, i.status,
        pv.version_number, pv.version_id,
        p.name package_name, p.sfid package_id,
        count(j.*) job_count
        FROM upgrade_item i
        inner join package_version pv on pv.version_id = i.package_version_id
        inner join package p on p.sfid = pv.package_id
        inner join upgrade_job j on j.item_id = i.id`;

const GROUP_BY_ALL_ITEMS = ` group by i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, i.status,
        pv.version_number, pv.version_id,
        p.name, p.sfid`;

const SELECT_ALL_ITEMS_BY_UPGRADE = 
        `${SELECT_ALL_ITEMS}
        where i.upgrade_id = $1
        ${GROUP_BY_ALL_ITEMS}`;

const SELECT_ONE_ITEM = `SELECT i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, i.status,
        pv.version_number, pv.version_id,
        p.name package_name
        FROM upgrade_item i
        INNER JOIN package_version pv on pv.version_id = i.package_version_id
        INNER JOIN package p on p.sfid = pv.package_id`;

const SELECT_ALL_JOBS = `SELECT j.id, j.upgrade_id, j.push_request_id, j.job_id, j.org_id, j.status,
        i.start_time,
        pv.version_number, pv.version_id,
        p.name package_name, p.sfid package_id,
        a.account_name
        FROM upgrade_job j
        INNER JOIN upgrade_item i on i.push_request_id = j.push_request_id
        INNER JOIN package_version pv on pv.version_id = i.package_version_id
        INNER JOIN package p on p.sfid = pv.package_id
        INNER JOIN org o on o.org_id = j.org_id
        INNER JOIN account a ON a.account_id = o.account_id`;

async function createUpgrade(scheduledDate, description) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let recs = await db.insert('INSERT INTO upgrade (start_time,description) VALUES ($1,$2)', [isoTime,description]);
    return recs[0];
}

async function createUpgradeItem(upgradeId, requestId, packageOrgId, versionId, scheduledDate, status) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let recs = await db.insert('INSERT INTO upgrade_item' +
        ' (upgrade_id, push_request_id, package_org_id, package_version_id, start_time, status)' +
        ' VALUES ($1,$2,$3,$4,$5,$6)',
        [upgradeId, requestId, packageOrgId, versionId, isoTime, status]);
    return recs[0];
}

async function updateUpgradeItemStatus(id, status) {
    await db.update('UPDATE upgrade_item SET status = $1 WHERE id = $2', [status, id]);
}

async function createUpgradeJobs(upgradeId, itemId, requestId, jobs) {
    let sql = `INSERT INTO upgrade_job (upgrade_id, item_id, push_request_id, job_id, org_id, status) VALUES`;
    let values = []; 
    for (let i = 0, n = 1; i < jobs.length; i++) {
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
        values.push(upgradeId, itemId, requestId, jobs[i].job_id, jobs[i].org_id, jobs[i].status);
    }

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
        if (req.query.fetchStatus === "true") {
            let completed = false;
            for (let i = 0; i < items.length; i++) {
                let item = items[i];
                let pushReqs = await push.findRequestsByIds(item.package_org_id, [item.push_request_id]);
                if (item.status !== pushReqs[0].Status) {
                    item.status = pushReqs[0].Status;
                    await updateUpgradeItemStatus(item.id, item.status);
                    console.log(`Status changed for item ${item.id} to ${item.status}`);
                    if (item.status === "Complete") {
                        completed = true;
                    }
                }
            }
            if (completed) {
                refreshLicenses().then(() => console.log("Done.")).catch((e) => console.error(e));
            }
        }

        return res.json(items);
    } catch (err) {
        next(err);
    }
}

async function refreshLicenses() {
    licensefetch.fetch();
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

async function requestJobsByUpgradeItem(req, res, next) {
    try {
        let jobs = await findJobsByUpgradeItem(req.query.itemId, req.query.sort_field, req.query.sort_dir);
        return res.json(jobs);
    } catch (err) {
        next(err);
    }
}

async function findJobsByUpgradeItem(itemId, sortField, sortDir) {
    let where = " WHERE j.item_id = $1";
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
    retrieveItemById(id).then(rec => res.json(rec))
        .catch(next);
}

async function retrieveItemById(id) {
    let where = " WHERE i.id = $1";
    let recs = await db.query(SELECT_ONE_ITEM + where, [id])
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

async function requestJobStatusByItem(req, res, next) {
    let id = req.params.id;
    try {
        let item = await retrieveItemById(id);
        let pushReqs = await push.findRequestsByIds(item.package_org_id, [item.push_request_id]);
        if (item.status !== pushReqs[0].Status) {
            item.status = pushReqs[0].Status;
            updateUpgradeItemStatus(item.id, item.status).then(() => console.log(`Status changed for item ${item.id} to ${item.status}`)).catch(err => console.error(err));
        }
        let pushJobs = await push.findJobsByRequestIds(item.package_org_id, [item.push_request_id]);
        let statusMap = {};
        let errorIds = [];
        for (let i = 0; i < pushJobs.length; i++) {
            let job = pushJobs[i];
            let shortId = job.Id.substring(0,15);
            statusMap[shortId] = job.Status;
            if (job.Status === 'Failed') {
                errorIds.push(shortId);
            }
        }

        let errorMap = {};
        let pushErrors = errorIds.length > 0 ? await push.findErrorsByJobIds(item.package_org_id, errorIds) : [];
        for (let i = 0; i < pushErrors.length; i++) {
            let err = pushErrors[i];
            let shortId = err.PackagePushJobId.substring(0,15);
            errorMap[shortId] = {
                title: err.ErrorTitle, severity: err.ErrorSeverity, type: err.ErrorType,
                message: err.ErrorMessage, details: err.ErrorDetails, job_id: shortId};
        }
        return res.json({item: item, status: statusMap, errors: errorMap});
    } catch (err) {
        next(err);
    }
}


async function requestActivateUpgradeItem(req, res, next) {
    return requestStatusUpdate(req, res, next, "Pending");
}

async function requestActivateUpgradeItems(req, res, next) {
    return requestUpdateItemStatus(req, res, next, "Pending");
}

async function requestCancelUpgradeItem(req, res, next) {
    return requestStatusUpdate(req, res, next, "Canceled");
}

async function requestCancelUpgradeItems(req, res, next) {
    return requestUpdateItemStatus(req, res, next, "Canceled");
}

async function requestStatusUpdate(req, res, next, status) {
    let id = req.params.id;
    try {
        return await push.updatePushRequests([id], status);
    } catch (err) {
        next(err);
    }
}

async function requestUpdateItemStatus(req, res, next, status) {
    const ids = req.body.items;
    try {
        let result = await push.updatePushRequests(ids, status);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

exports.requestById = requestById;
exports.requestItemById = requestItemById;
exports.requestJobById = requestJobById;
exports.requestAll = requestAll;
exports.requestItemsByUpgrade = requestItemsByUpgrade;
exports.requestJobsByUpgradeItem = requestJobsByUpgradeItem;
exports.requestJobStatusByItem = requestJobStatusByItem;
exports.createUpgrade = createUpgrade;
exports.createUpgradeItem = createUpgradeItem;
exports.createUpgradeJobs = createUpgradeJobs;
exports.requestActivateUpgradeItem = requestActivateUpgradeItem;
exports.requestActivateUpgradeItems = requestActivateUpgradeItems;
exports.requestCancelUpgradeItem = requestCancelUpgradeItem;
exports.requestCancelUpgradeItems = requestCancelUpgradeItems;
exports.findItemsByIds = findItemsByIds;
