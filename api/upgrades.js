const db = require('../util/pghelper');

const SELECT_ALL = `SELECT id, start_time FROM upgrade`;

const SELECT_ALL_ITEMS = `SELECT id, upgrade_id, push_request_id, package_org_id, package_version_id, start_time 
        FROM upgrade_item`;

async function createUpgrade(scheduledDate) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    return db.query('INSERT INTO upgrade (start_time) VALUES ($1)', [isoTime], true);
}

async function createUpgradeItem(upgradeId, requestId, packageOrgId, versionId, scheduledDate) {
    let isoTime = scheduledDate ? scheduledDate.toISOString ? scheduledDate.toISOString() : scheduledDate : null;
    return db.query('INSERT INTO upgrade_item' +
        ' (upgrade_id, push_request_id, package_org_id, package_version_id, start_time)' +
        ' VALUES ($1,$2,$3,$4,$5)',
        [upgradeId, requestId, packageOrgId, versionId, isoTime], true);
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
        let upgradeItems = await findAllItems(req.params.upgradeId, req.params.sort);
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