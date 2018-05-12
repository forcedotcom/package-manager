const db = require('../util/pghelper');
const orgs = require('./orgs');
const push = require('../worker/packagepush');
const logger = require('../util/logger').logger;

const SELECT_ALL = "SELECT id, name, description FROM org_group";

async function requestAll(req, res, next) {
    let whereParts = [],
        values = [],
        limit = "";

    let text = req.query.text;
    if (text) {
        values.push(`%${text}%`);
        whereParts.push(`(name LIKE $${values.length} OR description LIKE $${values.length})`);
        limit = " LIMIT 7"
    }

    if (req.query.excludeId) {
        values.push(req.query.excludeId);
        whereParts.push(`id != $${values.length}`)
    }
    
    let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
    let sort = ` ORDER BY ${req.query.sort_field || "name"} ${req.query.sort_dir || "asc"}`;

    try {
        let recs = await db.query(SELECT_ALL + where + sort + limit, values);
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

async function requestAddMembers(req, res, next) {
    try {
        let results = await insertOrgMembers(req.params.id, req.body.orgIds);
        return res.json(results);
    } catch (err) {
        return next(err);
    }
}

async function requestRemoveMembers(req, res, next) {
    try {
        await deleteOrgMembers(req.params.id, req.body.orgIds);
        return requestMembers(req, res, next);
    } catch (err) {
        return next(err);
    }
}

async function requestCreate(req, res, next) {
    try {
        let og = req.body;
        let rows = await db.insert('INSERT INTO org_group (name, description) VALUES ($1, $2)', [og.name, og.description || '']);
        return res.json(rows);
    } catch (err) {
        return next(err);
    }
}

async function requestUpdate(req, res, next) {
    try {
        let og = req.body;
        await db.update('UPDATE org_group SET name=$1, description=$2 WHERE id=$3', [og.name, og.description, og.id]);
        
        if (og.orgIds && og.orgIds.length > 0) {
            await insertOrgMembers(og.id, og.orgIds);
        }
        return res.send({result: 'ok'});
    } catch (err) {
        return next(err);
    }
}

async function requestDelete(req, res, next) {
    try {
        let ids = req.body.orggroupIds;
        let n = 1;
        let params = ids.map(v => `$${n++}`);
        await db.delete(`DELETE FROM org_group_member WHERE org_group_id IN (${params.join(",")})`, ids);
        await db.delete(`DELETE FROM org_group WHERE id IN (${params.join(",")})`, ids);
        return res.send({result: 'ok'});
    } catch (err) {
        return next(err);
    }
}

function requestUpgrade(req, res, next) {
    push.upgradeOrgGroups([req.params.id], req.body.versions, req.body.scheduled_date, req.session.username, req.body.description)
        .then((result) => {return res.json(result)})
        .catch((error) => {
            logger.error("Failed to upgrade org group", {org_group_id: req.params.id, ...error}); 
            next(error);
        });
}

async function insertOrgMembers(groupId, orgIds) {
    let n = 2;
    let params = orgIds.map(v => `($1,$${n++})`);
    let values = [groupId].concat(orgIds);
    let sql = `INSERT INTO org_group_member (org_group_id, org_id) VALUES ${params.join(",")}
               on conflict do nothing`;
    return await db.insert(sql, values);
}

async function deleteOrgMembers(groupId, orgIds) {
    let n = 2;
    let params = orgIds.map(v => `$${n++}`);
    let values = [groupId].concat(orgIds);
    let sql = `DELETE FROM org_group_member WHERE org_group_id = $1 AND org_id IN (${params.join(",")})`;
    return await db.delete(sql, values);
}

exports.requestAll = requestAll;
exports.requestById = requestById;
exports.requestMembers = requestMembers;
exports.requestAddMembers = requestAddMembers;
exports.requestRemoveMembers = requestRemoveMembers;
exports.requestCreate = requestCreate;
exports.requestUpdate = requestUpdate;
exports.requestDelete = requestDelete;
exports.requestUpgrade = requestUpgrade;