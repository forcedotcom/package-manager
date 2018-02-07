const db = require('./pghelper');

const SELECT_ALL = "SELECT l.id, l.sfid, l.name, l.sflma__subscriber_org_id__c as org_id, l.sflma__status__c as status" +
    ", l.sflma__install_date__c as install_date, l.sflma__org_instance__c as instance, l.sflma__expiration__c as expiration" +
    ", l.sflma__used_licenses__c as used_license_count, l.sflma__license_type__c as type, l.sflma__account__c as account_id" +
    ", l.sflma__package__c as package_id, l.sflma__package_version__c as package_version_id" +
    ", a.name as account_name, p.name as package_name, pv.name as package_version_name" +
    " FROM sflma__license__c l" +
    " INNER JOIN account as a on l.sflma__account__c = a.sfid" +
    " INNER JOIN sflma__package__c as p on l.sflma__package__c = p.sfid" +
    " INNER JOIN sflma__package_version__c as pv on l.sflma__package_version__c = pv.sfid";

function findAll(req, res, next) {
    let accountId = req.query.account_id,
        status = req.query.status,
        whereParts = ["l.sflma__org_instance__c IS NOT NULL"],
        values = [];

    if (accountId) {
        values.push(parseInt(accountId));
        whereParts.push("l.sflma__account__c = $" + values.length);
    }

    if (status) {
        values.push(status);
        whereParts.push("l.sflma__status__c = $" + values.length);
    }

    let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
    let sort = " ORDER BY " + (req.query.sort || "name");
    let limit = " LIMIT 20";

    db.query(SELECT_ALL + where + sort + limit, values)
        .then(function (recs) {
            return res.send(JSON.stringify(recs));
        })
        .catch(next);

}

function findById(req, res, next) {
    let id = req.params.id;

    let where = " WHERE l.id = $1";

    db.query(SELECT_ALL + where, [id])
        .then(function (recs) {
            return res.json(recs[0]);
        })
        .catch(next);
}

exports.findAll = findAll;
exports.findById = findById;