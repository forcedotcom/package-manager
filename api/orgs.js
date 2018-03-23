const db = require('../util/pghelper');
const push = require('../worker/packagepush');


const SELECT_ALL = `select o.id, o.org_id, o.instance, o.type, o.status, o.account_name, o.account_id from org o`;
const SELECT_MEMBERS = SELECT_ALL +
    " INNER JOIN org_group_member AS m ON o.org_id = m.org_id";

const SELECT_WITH_LICENCE = SELECT_ALL +
    " INNER JOIN sfLma__licence__c AS lc ON o.org_id = lc.sflma__subscriber_org_id__c";

async function requestAll(req, res, next) {
    let limit = " LIMIT 300";

    try {
        let orgs = await findAll(req.params.packageId, req.params.packageVersionId, limit, req.query.sort);
        return res.send(JSON.stringify(orgs));
    } catch (err) {
        next(err);
    }
}

async function findAll(packageId, packageVersionId, limit, orderBy) {
    let select = SELECT_ALL;
    let whereParts = ["o.instance IS NOT NULL"];
    let values = [];

    if (packageId) {
        select = SELECT_WITH_LICENCE;
        whereParts.push("lc.sflma__package__c = $" + values.length);
        values.push(packageId);
    }

    if (packageVersionId) {
        select = SELECT_WITH_LICENCE;
        whereParts.push("lc.sflma__package_version__c = $" + values.length);
        values.push(packageVersionId);
    }

    let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
    let sort = " ORDER BY " + (orderBy || "account_name");
    return await db.query(select + where + sort + (limit || ""), [])
}

function requestById(req, res, next) {
    let id = req.params.id;
    let where = " WHERE o.org_id = $1";
    db.query(SELECT_ALL + where, [id])
        .then(function (org) {
            return res.json(org[0]);
        })
        .catch(next);
}

function requestUpgrade(req, res, next) {
    push.upgradeOrg(req.params.id, req.body.versions, req.body.scheduled_date)
        .then((jobs) => {return res.json(jobs)})
        .catch((e) => {console.error(e); next(e)});
}

async function findByGroup(orgGroupId) {
    let where = " WHERE m.org_group_id = $1";
    return await db.query(SELECT_MEMBERS + where, [orgGroupId])
}

exports.requestAll = requestAll;
exports.requestById = requestById;
exports.requestUpgrade = requestUpgrade;
exports.findByGroup = findByGroup;