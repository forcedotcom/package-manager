const db = require('../util/pghelper');
const push = require('../worker/packagepush');
const sfdc = require('../api/sfdcconn');


const SELECT_ALL = `select u.id, u.start_time, count(i.*) item_count
                    from upgrade u
                    inner join upgrade_item i on i.upgrade_id = u.id
                    group by u.id, u.start_time`;

const SELECT_ONE = `select u.id, u.start_time, count(i.*) item_count
                    from upgrade u
                    inner join upgrade_item i on i.upgrade_id = u.id
                    where u.id = $1
                    group by u.id, u.start_time`;

const SELECT_ALL_ITEMS = `SELECT i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, 
        pv.version_number, pv.version_id,
        p.name package_name,
        count(j.*) job_count
        FROM upgrade_item i
        inner join package_version pv on pv.version_id = i.package_version_id
        inner join package p on p.sfid = pv.package_id
        inner join upgrade_job j on j.item_id = i.id
        where i.upgrade_id = $1
        group by i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, 
        pv.version_number, pv.version_id,
        p.name`;


const SELECT_ONE_ITEM = `SELECT i.id, i.upgrade_id, i.push_request_id, i.package_org_id, i.start_time, 
        pv.version_number, pv.version_id,
        p.name package_name
        FROM upgrade_item i
        INNER JOIN package_version pv on pv.version_id = i.package_version_id
        INNER JOIN package p on p.sfid = pv.package_id`;

const SELECT_ALL_JOBS = `SELECT j.id, j.upgrade_id, j.push_request_id, j.job_id, j.org_id, j.status,
        i.start_time,
        pv.version_number, pv.version_id,
        p.name package_name,
        o.account_name
        FROM upgrade_job j
        INNER JOIN upgrade_item i on i.push_request_id = j.push_request_id
        INNER JOIN package_version pv on pv.version_id = i.package_version_id
        INNER JOIN package p on p.sfid = pv.package_id
        INNER JOIN org o on o.org_id = j.org_id`;

async function createUpgrade(scheduledDate) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let recs = await db.insert('INSERT INTO upgrade (start_time) VALUES ($1)', [isoTime]);
    return recs[0];
}


async function createUpgradeItem(upgradeId, requestId, packageOrgId, versionId, scheduledDate, status) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let recs = await db.insert('INSERT INTO upgrade_item' +
        ' (upgrade_id, push_request_id, package_org_id, package_version_id, start_time, status)' +
        ' VALUES ($1,$2,$3,$4,$5)',
        [upgradeId, requestId, packageOrgId, versionId, isoTime, status]);
    return recs[0];
}

async function createUpgradeJob(upgradeId, itemId, requestId, jobId, orgIds, status) {
    let sql = `INSERT INTO upgrade_job (upgrade_id, item_id, push_request_id, job_id, org_id, status) VALUES`;
    let values = [];
    for (let i = 0, n = 1; i < orgIds.length; i++) {
        let orgId = orgIds[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;
        values.push(upgradeId, itemId, requestId, jobId, orgId, status);
    }

    await db.insert(sql, values);
}

async function requestAll(req, res, next) {
    try {
        let upgrades = await findAll(req.query.sort_field, req.query.sort_dir);
        return res.send(JSON.stringify(upgrades));
    } catch (err) {
        next(err);
    }
}

async function findAll(sortField, sortDir) {
    let orderBy = ` ORDER BY ${sortField || "start_time"} ${sortDir || "asc"}`;
    return await db.query(SELECT_ALL + orderBy, [])
}

async function requestAllItems(req, res, next) {
    try {
        let upgradeItems = await findAllItems(req.query.upgradeId, req.query.sort_field, req.query.sort_dir);
        return res.send(JSON.stringify(upgradeItems));
    } catch (err) {
        next(err);
    }
}

async function findAllItems(upgradeId, sortField, sortDir) {
    let orderBy = ` ORDER BY  ${sortField || "push_request_id"} ${sortDir || "asc"}`;
    return await db.query(SELECT_ALL_ITEMS + orderBy, [upgradeId])
}

async function requestAllJobs(req, res, next) {
    try {
        let jobs = await findAllJobs(req.query.itemId, req.query.sort_field, req.query.sort_dir);
        return res.send(JSON.stringify(jobs));
    } catch (err) {
        next(err);
    }
}

async function findAllJobs(itemId, sortField, sortDir) {
    let where = " WHERE j.item_id = $1";
    let orderBy = ` ORDER BY  ${sortField || "item_id"} ${sortDir || "asc"}`;
    return await db.query(SELECT_ALL_JOBS + where + orderBy, [itemId])
}

function requestById(req, res, next) {
    let id = req.params.id;
    db.query(SELECT_ONE, [id])
        .then(function (recs) {
            return res.json(recs[0]);
        })
        .catch(next);
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

async function requestJobStatusByItemId(req, res, next) {
    let id = req.params.id;
    try {
        let item = await retrieveItemById(id);
        let pushJobs = await push.findJobsByRequestIds(item.package_org_id, [item.push_request_id]);
        let statusMap = {};
        for (let i = 0; i < pushJobs.length; i++) {
            let job = pushJobs[i];
            statusMap[job.id] = job.Status;
        }
        return res.send(JSON.stringify(statusMap));
    } catch (err) {
        next(err);
    }
}

async function requestActivateUpgradeItem(req, res, next) {
    return requestStatusUpdate(req, res, next, "Pending");
}

async function requestCancelUpgradeItem(req, res, next) {
    return requestStatusUpdate(req, res, next, "Canceled");
}

async function requestStatusUpdate(req, res, next, status) {
    let id = req.params.id;
    try {
        let item = await retrieveItemById(id);
        return await push.updatePushRequest(item.package_org_id, item.push_request_id, status);
    } catch (err) {
        next(err);
    }
}

exports.requestById = requestById;
exports.requestItemById = requestItemById;
exports.requestJobById = requestJobById;
exports.requestAll = requestAll;
exports.requestAllItems = requestAllItems;
exports.requestAllJobs = requestAllJobs;
exports.requestJobStatusByItemId = requestJobStatusByItemId;
exports.createUpgrade = createUpgrade;
exports.createUpgradeItem = createUpgradeItem;
exports.createUpgradeJob = createUpgradeJob;
exports.requestActivateUpgradeItem = requestActivateUpgradeItem;
exports.requestCancelUpgradeItem = requestCancelUpgradeItem;
