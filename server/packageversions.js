const db = require('./pghelper');

const SELECT_ALL = "SELECT pv.id, pv.sfid, pv.name, p.name as package_name, pv.sflma__version__c as version_number, pv.sflma__package__c as package_id, " +
    "    pv.sflma__release_date__c as release_date, pv.status__c as status, pv.sflma__version_id__c as version_id " +
    "    FROM sflma__package_version__c as pv " +
    "    INNER JOIN sflma__package__c as p on pv.sflma__package__c = p.sfid ";

async function requestAll(req, res, next) {
    let packageId = req.query.packageId,
        orgId = req.query.orgId,
        status = req.query.status || "Verified",
        whereParts = [],
        values = [];

    if (status !== "All") {
        values.push(status);
        whereParts.push("pv.status__c = $" + values.length);
    }

    if (packageId) {
        values.push(packageId);
        whereParts.push("pv.sflma__package__c = $" + values.length);
    }

    if (orgId) {
        values.push(orgId);
        whereParts.push("p.sflma__developer_org_id__c = $" + values.length);
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

async function requestById(req, res, next) {
    let id = req.params.id;
    let where = " WHERE " + ((typeof id === "string") ? "pv.sfid = $1" : "pv.id = $1");

    try {
        let recs = await db.query(SELECT_ALL + where, [id])
        return res.json(recs[0]);
    } catch (err) {
        next(err);
    }
}

exports.requestAll = requestAll;
exports.requestById = requestById;