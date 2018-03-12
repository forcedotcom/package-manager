const db = require('./pghelper');
const org62 = require('./org62Fetch');

const SELECT_ORGS_FROM_LICENSES = `SELECT DISTINCT l.sflma__subscriber_org_id__c AS id, l.sflma__org_instance__c AS instance FROM sflma__license__c l`;

const SELECT_ALL = `select o.id, o.org_id, o.name, o.instance, o.type, o.status, o.account_name, o.account_id, o.aov_band
                    from org o`;
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

async function upsertOrgs(orgs, batchSize) {
    if (orgs.length <= batchSize) {
        return await upsertOrgsBatch(orgs);
    }
    let count = orgs.length;
    for (let start = 0; start < count;) {
        console.log(`Batching ${start} of ${count}`);
        await upsertOrgsBatch(orgs.slice(start, start += batchSize));
    }
}

async function upsertOrgsBatch(orgs) {
    let values = [];
    let sql = "INSERT INTO org (org_id, instance, type, status, account_id, account_name, aov_band) VALUES";
    for (let i = 0, n = 1; i < orgs.length; i++) {
        let org = orgs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
        values.push(org.org_id, org.instance, org.type, org.status, org.account_id, org.account_name, org.aov_band);
    }
    sql += ` on conflict (org_id) do update set
        name = excluded.name, instance = excluded.instance, type = excluded.type, status = excluded.status,
        account_id = excluded.account_id, account_name = excluded.account_name, aov_band = excluded.aov_band`;
    await db.query(sql, values, false, true);
}


function requestUpgrade(req, res, next) {
    let orgId = req.params.id;
    let licenses = req.body.licenses;
    console.error('Ummmm....upgrade this org with the latest versions of these packages');
}

async function findByGroup(orgGroupId) {
    let where = " WHERE m.org_group_id = $1";
    return await db.query(SELECT_MEMBERS + where, [orgGroupId])
}

async function updateOrgs() {
    let orgs = await org62.fetchOrgs();
    await upsertOrgs(orgs, 2000);
}

exports.requestAll = requestAll;
exports.requestById = requestById;
exports.requestUpgrade = requestUpgrade;
exports.findByGroup = findByGroup;
exports.updateOrgs = updateOrgs;