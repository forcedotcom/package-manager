const db = require('./pghelper');

const SELECT_ALL = "SELECT id, sfid, name, sflma__version__c as version_number, sflma__package__c as package_id, " +
    "sflma__release_date__c as release_date, status__c as status, sflma__version_id__c as version_id " +
    "FROM sflma__package_version__c";

async function findAll(req, res, next) {
    let packageId = req.query.packageId,
        status = req.query.status || "Verified",
        whereParts = [],
        values = [];

    if (status !== "All") {
        values.push(status);
        whereParts.push("status__c = $" + values.length);
    }

    if (packageId) {
        values.push(packageId);
        whereParts.push("sflma__package__c = $" + values.length);
    }

    let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
    let sort = " ORDER BY " + (req.query.sort || "release_date desc");

    try {
        let recs = await db.query(SELECT_ALL + where + sort, values);
        return res.send(JSON.stringify(recs));
    } catch (err) {
        next(err);
    }
}

async function findById(req, res, next) {
    let id = req.params.id;
    let where = " WHERE " + ((typeof id === "string") ? "sfid = $1" : "id = $1");

    try {
        let recs = await db.query(SELECT_ALL + where, [id])
        return res.json(recs[0]);
    } catch (err) {
        next(err);
    }
}

exports.findAll = findAll;
exports.findById = findById;