const db = require('./pghelper');
const orgs = require('./orgs');

const SELECT_ALL = "SELECT id, name, description FROM org_group";

async function requestAll(req, res, next) {
    let whereParts = [],
        values = [];

    let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
    let sort = " ORDER BY " + (req.query.sort || "name");

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
        let recs = await db.query(SELECT_ALL + where, [req.params.id])
        return res.json(recs[0]);
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

function requestCreate(req, res, next) {
    let og = req.body;
    db.query('INSERT INTO org_group (name, description) VALUES ($1, $2)',
        [og.name, og.description], true)
        .then(function () {
            return res.send({result: 'ok'});
        })
        .fail(function(err) {
            return next(err);
        });

}

function requestUpdate(req, res, next) {
    let og = req.body;
    db.query('UPDATE org_group SET name=$1, description=$2 WHERE id=$3',
        [og.name, og.description, og.id], true)
        .then(function () {
            return res.send({result: 'ok'});
        })
        .fail(function(err) {
            return next(err);
        });

}

function requestDelete(req, res, next) {
    db.query('DELETE FROM org_group WHERE id=$1', [req.params.id], true)
        .then(function () {
            return res.send({result: 'ok'});
        })
        .fail(function(err) {
            return next(err);
        });

}

exports.requestAll = requestAll;
exports.requestById = requestById;
exports.requestMembers = requestMembers;
exports.requestCreate = requestCreate;
exports.requestUpdate = requestUpdate;
exports.requestDelete = requestDelete;