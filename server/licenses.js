const db = require('./pghelper');

const SELECT_ALL = "SELECT l.id, l.sfid, l.name, o.org_id as org_id, l.sflma__status__c as status" +
    ", l.sflma__install_date__c as install_date, o.instance as instance, l.sflma__expiration__c as expiration" +
    ", l.sflma__used_licenses__c as used_license_count, o.type as type, o.account_id as account_id" +
    ", l.sflma__package__c as package_id, l.sflma__package_version__c as package_version_id" +
    ", o.account_name as account_name, p.name as package_name, pv.name as version_name, pv.sflma__version_number__c as version_number" +
    " FROM sflma__license__c l" +
    " INNER JOIN org as o on l.sflma__subscriber_org_id__c = o.org_id" +
    " INNER JOIN sflma__package__c as p on l.sflma__package__c = p.sfid" +
    " INNER JOIN sflma__package_version__c as pv on l.sflma__package_version__c = pv.sfid";

function requestAll(req, res, next) {
    let accountId = req.query.account_id,
        orgId = req.query.org_id;

    findAll(accountId, orgId, req.query.sort)
        .then((recs) => {return res.send(JSON.stringify(recs))})
        .catch(next);
}

async function findAll(accountId, orgId, orderBy) {
    let whereParts = ["o.instance IS NOT NULL"],
        values = [];

    if (accountId) {
        values.push(accountId);
        whereParts.push("o.account_id = $" + values.length);
    }

    if (orgId) {
        values.push(orgId);
        whereParts.push("o.org_id = $" + values.length);
    }

    let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
    let sort = " ORDER BY " + (orderBy || "name");
    let limit = " LIMIT 20";

    return db.query(SELECT_ALL + where + sort + limit, values);
}

function requestById(req, res, next) {
    let id = req.params.id;

    let where = " WHERE l.sfid = $1";

    db.query(SELECT_ALL + where, [id])
        .then((recs) => {return res.json(recs[0])})
        .catch(next);
}

exports.requestAll = requestAll;
exports.findAll = findAll;
exports.requestById = requestById;