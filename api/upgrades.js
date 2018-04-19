const db = require('../util/pghelper');

const SELECT_ALL = `SELECT id, start_time FROM upgrade`;

const SELECT_ALL_ITEMS = `SELECT id, upgrade_id, push_request_id, package_org_id, package_version_id, start_time 
        FROM upgrade_item`;

async function createUpgrade(scheduledDate) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let recs = await db.insert('INSERT INTO upgrade (start_time) VALUES ($1)', [isoTime]);
    return recs[0];
}


async function createUpgradeItem(upgradeId, requestId, packageOrgId, versionId, scheduledDate) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    let recs = await db.insert('INSERT INTO upgrade_item' +
        ' (upgrade_id, push_request_id, package_org_id, package_version_id, start_time)' +
        ' VALUES ($1,$2,$3,$4,$5)',
        [upgradeId, requestId, packageOrgId, versionId, isoTime]);
    return recs[0];
}

async function createUpgradeJob(upgradeId, requestId, jobId, orgIds, status) {
    let sql = `INSERT INTO upgrade_job (upgrade_id, push_request_id, job_id, org_id, status) VALUES`;
    let values = [];
    for (let i = 0, n = 1; i < orgIds.length; i++) {
        let orgId = orgIds[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;
        values.push(upgradeId, requestId, jobId, orgId, status);
    }

    await db.insert(sql, values);
}

async function requestAll(req, res, next) {
    try {
        let upgrades = await findAll();
        return res.send(JSON.stringify(upgrades));
    } catch (err) {
        next(err);
    }
}

async function findAll() {
    let sort = " ORDER BY start_time asc";
    return await db.query(SELECT_ALL + sort, [])
}

async function requestAllItems(req, res, next) {
    try {
        let upgradeItems = await findAllItems(req.query.upgradeId, req.query.sort);
        return res.send(JSON.stringify(upgradeItems));
    } catch (err) {
        next(err);
    }
}

async function findAllItems(upgradeId, sort) {
    let orderBy = " ORDER BY " + (sort || "push_request_id");
    return await db.query(SELECT_ALL_ITEMS + orderBy, [])
}

function requestById(req, res, next) {
    let id = req.params.id;
    let where = " WHERE id = $1";
    db.query(SELECT_ALL + where, [id])
        .then(function (org) {
            return res.json(org[0]);
        })
        .catch(next);
}

exports.requestById = requestById;
exports.requestAll = requestAll;
exports.requestAllItems = requestAllItems;
exports.createUpgrade = createUpgrade;
exports.createUpgradeItem = createUpgradeItem;
exports.createUpgradeJob = createUpgradeJob;