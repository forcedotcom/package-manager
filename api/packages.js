const db = require('../util/pghelper');

const SELECT_ALL_HEROKU_CONNECT = "SELECT id, sfid, name, sflma__developer_org_id__c as package_org_id, sflma__package_id__c as package_id" +
    " FROM sflma__package__c";

const SELECT_ALL = "SELECT id, sfid, name, package_org_id, package_id" +
    " FROM package";

async function requestAll(req, res, next) {
    let orgId = req.query.org_id,
        whereParts = [],
        values = [];

    if (orgId) {
        values.push(orgId);
        whereParts.push("org_id = $" + values.length);
    }

    let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
    let sort = ` ORDER BY ${req.query.sort_field || "name"} ${req.query.sort_dir}`;

    try {
        let recs = await db.query(SELECT_ALL + where + sort, values);
        return res.send(JSON.stringify(recs));
    } catch (err) {
        next(err);
    }
}

async function requestById(req, res, next) {
    let id = req.params.id;
    let where = " WHERE " + ((typeof id === "string") ? "sfid = $1" : "id = $1");

    try {
        let recs = await db.query(SELECT_ALL + where, [id])
        return res.json(recs[0]);
    } catch (err) {
        next(err);
    }
}

exports.requestAll = requestAll;
exports.requestById = requestById;