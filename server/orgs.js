const db = require('./pghelper');

const SELECT_ALL = "SELECT DISTINCT l.sflma__subscriber_org_id__c AS id" +
    ", l.sflma__org_instance__c AS instance, l.sflma__account__c AS account_id, a.name AS account_name" +
    " FROM sflma__license__c l" +
    " INNER JOIN account AS a ON l.sflma__account__c = a.sfid";

async function findAll(req, res, next) {
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

function findById(req, res, next) {
    let id = req.params.id;

    let where = " WHERE l.sflma__subscriber_org_id__c = $1";

    db.query(SELECT_ALL + where, [id])
        .then(function (property) {
            return res.json(property[0]);
        })
        .catch(next);
}

exports.findAll = findAll;
exports.findById = findById;