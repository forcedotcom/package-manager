const db = require('./pghelper');


const SELECT_ALL = "SELECT id, sfid, name, sflma__developer_org_id__c as org_id, sflma__package_id__c as package_id" +
    " FROM sflma__package__c";

async function requestAll(req, res, next) {
    let orgId = req.query.org_id,
        whereParts = [],
        values = [];

    if (orgId) {
        values.push(orgId);
        whereParts.push("sflma__developer_org_id__c = $" + values.length);
    }

    let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
    let sort = " ORDER BY " + (req.query.sort || "name");

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