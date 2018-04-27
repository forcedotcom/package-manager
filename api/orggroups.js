const db = require('../util/pghelper');
const orgs = require('./orgs');
const push = require('../worker/packagepush');

const SELECT_ALL = "SELECT id, name, description FROM org_group";

async function requestAll(req, res, next) {
    let whereParts = [],
        values = [];

    let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
    let sort = ` ORDER BY ${req.query.sort_field || "name"} ${req.query.sort_dir || "asc"}`;

    try {
        let recs = await db.query(SELECT_ALL + where + sort, values);
        return res.json(recs);
    } catch (err) {
        next(err);
    }
}

async function requestById(req, res, next) {
    let where = " WHERE id = $1";

    try {
        let rows = await db.query(SELECT_ALL + where, [req.params.id])
        return res.json(rows[0]);
    } catch (err) {
        next(err);
    }
}

async function requestMembers(req, res, next) {
    try {
        let recs = await orgs.findByGroup(req.params.id);
        return res.json(recs);
    } catch (err) {
        next(err);
    }
}

async function requestCreate(req, res, next) {
    try {
        let og = req.body;
        let rows = await db.insert('INSERT INTO org_group (name, description) VALUES ($1, $2)', [og.name, og.description]);
        return res.json(rows);
    } catch (err) {
        return next(err);
    }
}

async function requestUpdate(req, res, next) {
    try {
        let og = req.body;
        await db.update('UPDATE org_group SET name=$1, description=$2 WHERE id=$3', [og.name, og.description, og.id]);
        
        if (og.orgIds) {
            await insertOrgMembers(og.id, og.orgIds);
        }
        return res.send({result: 'ok'});
    } catch (err) {
        return next(err);
    }
}

async function requestDelete(req, res, next) {
    try {
        await db.delete('DELETE FROM org_group WHERE id=$1', [req.params.id]);
        return res.send({result: 'ok'});
    } catch (err) {
        return next(err);
    }
}

function requestUpgrade(req, res, next) {
    push.upgradeOrgGroups([req.params.id], req.body.versions, req.body.scheduled_date)
        .then((upgrade) => {return res.json(upgrade)})
        .catch((e) => {console.error(e); next(e)});
}

async function insertOrgMembers(groupId, orgIds) {
    let n = 2;
    let params = orgIds.map(v => `($1,$${n++})`);
    let values = [groupId].concat(orgIds); 
    let sql = `INSERT INTO org_group_member (org_group_id, org_id) VALUES ${params.join(",")}
               on conflict do nothing`;
    await db.insert(sql, values);
}

exports.requestAll = requestAll;
exports.requestById = requestById;
exports.requestMembers = requestMembers;
exports.requestCreate = requestCreate;
exports.requestUpdate = requestUpdate;
exports.requestDelete = requestDelete;
exports.requestUpgrade = requestUpgrade;