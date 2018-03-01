const db = require('./pghelper');

const SELECT_ALL = "SELECT DISTINCT l.sflma__subscriber_org_id__c AS id" +
    ", l.sflma__org_instance__c AS instance, l.sflma__account__c AS account_id, a.name AS account_name" +
    " FROM sflma__license__c l" +
    " INNER JOIN account AS a ON l.sflma__account__c = a.sfid";

const SELECT_MEMBERS = SELECT_ALL +
    " INNER JOIN org_group_member AS m ON l.sflma__subscriber_org_id__c = m.org_id";

async function requestAll(req, res, next) {
    let whereParts = ["l.sflma__org_instance__c IS NOT NULL"],
        values = [];

    let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
    let sort = " ORDER BY " + (req.query.sort || "account_name");
    let limit = " LIMIT 20";

    try {
        let orgs = await db.query(SELECT_ALL + where + sort + limit, values)
        return res.send(JSON.stringify(orgs));
    } catch(err) {
        next(err);
    }
}

function requestById(req, res, next) {
    let id = req.params.id;

    let where = " WHERE l.sflma__subscriber_org_id__c = $1";

    db.query(SELECT_ALL + where, [id])
        .then(function (property) {
            return res.json(property[0]);
        })
        .catch(next);
}

function requestUpgrade(req, res, next) {
    let orgId = req.params.id;
    let licenses = req.body.licenses;
    console.error('Ummmm....upgrade this org with the latest versions of these packages');
}

function findByGroup(orgGroupId) {

    let where = " WHERE m.org_group_id = $1";

    db.query(SELECT_MEMBERS + where, [orgGroupId])
        .then(function (property) {
            return res.json(property[0]);
        })
        .catch(next);
}

exports.requestAll = requestAll;
exports.requestById = requestById;
exports.requestUpgrade = requestUpgrade;
exports.findByGroup = findByGroup;
