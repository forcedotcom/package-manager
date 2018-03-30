const db = require('../util/pghelper');

const SELECT_ALL_HEROKU_CONNECT = `SELECT 
    l.id, l.sfid, l.name, l.sflma__subscriber_org_id__c as org_id, l.sflma__status__c as status,
    l.sflma__install_date__c as install_date, l.LastModifiedDate as modified_date, l.sflma__expiration__c as expiration,
    l.sflma__used_licenses__c as used_license_count, l.sflma__package_version__c as package_version_id, 
    o.instance as instance, o.type as type, o.account_id as account_id, o.account_name as account_name, 
    pv.sflma__package__c as package_id, pv.name as version_name, pv.sflma__version_number__c as version_number, pv.sflma__version_id__c as version_id,
    p.name as package_name
    FROM sflma__license__c l
    INNER JOIN org as o on l.sflma__subscriber_org_id__c = o.org_id
    INNER JOIN sflma__package_version__c as pv on l.sflma__package_version__c = pv.sfid
    INNER JOIN sflma__package__c as p on pv.sflma__package__c = p.sfid`;

const SELECT_ALL = `SELECT 
    l.id, l.sfid, l.name, l.org_id, l.status, 
    l.install_date, l.expiration, 
    l.used_license_count, l.package_version_id, 
    o.instance, o.type, o.account_id, o.account_name,
    pv.package_id, pv.name as version_name, pv.version_number, pv.version_id,
    p.name as package_name
    FROM license l
    INNER JOIN org as o on l.org_id = o.org_id
    INNER JOIN package_version as pv on l.package_version_id = pv.sfid
    INNER JOIN package as p on pv.package_id = p.sfid`;

function requestAll(req, res, next) {
    let orgId = req.query.org_id;

    findAll(orgId, req.query.sort)
        .then((recs) => {return res.send(JSON.stringify(recs))})
        .catch(next);
}

async function findAll(orgId, orderBy) {
    let whereParts = ["o.instance IS NOT NULL"],
        values = [];

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