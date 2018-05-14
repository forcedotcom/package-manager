const db = require('../util/pghelper');
const push = require('../worker/packagepush');
const logger = require('../util/logger').logger;
const sfdc = require('../api/sfdcconn');
const packageorgs = require('../api/packageorgs');

const SELECT_ALL = `
    SELECT o.id, o.org_id, o.name, o.status, o.type, o.instance, o.is_sandbox, o.account_id,
    a.account_name,
    STRING_AGG(g.name, ', ') as groups
    FROM org o
    INNER JOIN account a on a.account_id = o.account_id
    LEFT JOIN org_group_member AS m ON o.org_id = m.org_id
    LEFT JOIN org_group AS g ON g.id = m.org_group_id`;

const GROUP_BY = `
    GROUP BY o.id, o.org_id, o.name, o.status, o.type, o.instance, o.is_sandbox, o.account_id, 
    a.account_name`;

const SELECT_WITH_LICENCE = SELECT_ALL + 
    ` INNER JOIN license lc ON o.org_id = lc.org_id`;

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
    return await db.query(select + where + GROUP_BY + sort, values)
}

function requestById(req, res, next) {
    let id = req.params.id;
    let where = " WHERE o.org_id = $1";
    db.query(SELECT_ALL + where + GROUP_BY, [id])
        .then(function (org) {
            return res.json(org[0]);
        })
        .catch(next);
}

function requestUpgrade(req, res, next) {
    push.upgradeOrgs([req.params.id], req.body.versions, req.body.scheduled_date, req.session.username, req.body.description)
        .then((result) => {
            return res.json(result)
        })
        .catch((error) => {
            logger.error("Failed to upgrade org", {org_id: req.params.id, ...error}); 
            next(error);
        });
}

async function requestAdd(req, res, next) {
    let packageOrgs = await db.query(`SELECT org_id FROM package_org WHERE status = $1 AND namespace is not null`, [packageorgs.Status.Connected]);
    let packageOrgIds = packageOrgs.map(o => o.org_id); 
    await push.findSubscribersByIds(packageOrgIds, req.body.orgIds)
        .then(async (recs) => {
            await insertOrgsFromSubscribers(recs);
            await insertOrgPackageVersionsFromSubscribers(recs);
            await requestAll(req, res, next);
        })
        .catch((error) => {
            logger.error("Failed to fetch subscriber orgs", {package_org_id: packageOrgIds, ...error});
            next(error);
        });
}

async function insertOrgsFromSubscribers(recs) {
    let params = [], values = [];
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        params.push(`($${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`);
        values.push(rec.OrgKey.substring(0,15), rec.OrgName, rec.OrgType, rec.InstanceName, sfdc.INTERNAL_ID, new Date().toISOString());
    }

    let sql = `INSERT INTO org (org_id, name, type, instance, account_id, modified_date) 
                       VALUES ${params.join(",")}
                       on conflict (org_id) do update set status = null, account_id = excluded.account_id where org.status = 'Not Found'`;
    return db.insert(sql, values);
}

async function insertOrgPackageVersionsFromSubscribers(recs) {
    let versionIds = recs.map(r => r.MetadataPackageVersionId);
    let versions = await db.query(`SELECT sfid, package_id, version_id FROM package_version WHERE version_id IN ('${versionIds.join("','")}')`);
    let versionMap = {};
    for (let i = 0; i < versions.length; i++) {
        let v = versions[i];
        versionMap[v.version_id] = v;
    }
    
    let params = [], values = [];
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        let pv = versionMap[rec.MetadataPackageVersionId];
        params.push(`($${n++},$${n++},$${n++},$${n++},$${n++})`);
        values.push(rec.OrgKey.substring(0,15), pv.package_id, pv.sfid, "None", new Date().toISOString());
    }

    let sql = `INSERT INTO org_package_version (org_id, package_id, package_version_id, license_status, modified_date) 
                       VALUES ${params.join(",")}
                       on conflict (org_id, package_id) do nothing`;
    return db.insert(sql, values);
}

async function findByGroup(orgGroupId) {
    let where = " WHERE m.org_group_id = $1";
    return await db.query(SELECT_ALL + where + GROUP_BY, [orgGroupId])
}

async function findByIds(orgIds) {
    let n = 1;
    let params = orgIds.map(() => `$${n++}`);
    let where = `WHERE org_id IN (${params.join(",")})`;
    return await db.query(SELECT_ALL + where + GROUP_BY, orgIds)
}


exports.requestAll = requestAll;
exports.requestAdd = requestAdd;
exports.requestById = requestById;
exports.requestUpgrade = requestUpgrade;
exports.findByGroup = findByGroup;
exports.findByIds = findByIds;
