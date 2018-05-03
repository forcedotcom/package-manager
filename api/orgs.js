const db = require('../util/pghelper');
const push = require('../worker/packagepush');


const SELECT_ALL = `SELECT o.id, o.org_id, o.name, o.status, o.type, o.instance, o.is_sandbox, o.account_id,
                    a.account_name
                    FROM org o
                    INNER JOIN account a on a.account_id = o.account_id`;

const SELECT_MEMBERS = SELECT_ALL +
    " INNER JOIN org_group_member AS m ON o.org_id = m.org_id";

const SELECT_WITH_LICENCE = SELECT_ALL +
    " INNER JOIN license lc ON o.org_id = lc.org_id";

async function requestAll(req, res, next) {
    try {
        let orgs = await findAll(req.query.packageId, req.query.packageVersionId, req.query.sort_field, req.query.sort_dir);
        return res.send(JSON.stringify(orgs));
    } catch (err) {
        next(err);
    }
}

async function findAll(packageId, packageVersionId, orderByField, orderByDir) {
    let select = SELECT_ALL;
    let whereParts = ["o.status is null"];
    let values = [];

    if (packageId) {
        select = SELECT_WITH_LICENCE;
        values.push(packageId);
        whereParts.push("lc.package_id = $" + values.length);
    }

    if (packageVersionId) {
        select = SELECT_WITH_LICENCE;
        values.push(packageVersionId);
        whereParts.push("lc.package_version_id = $" + values.length);
    }

    let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
    let sort = ` ORDER BY ${orderByField || "account_name"} ${orderByDir || "asc"}`;
    return await db.query(select + where + sort, values)
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
    push.upgradeOrgs([req.params.id], req.body.versions, req.body.scheduled_date, req.body.description)
        .then((upgrade) => {
            return res.json(upgrade)
        })
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