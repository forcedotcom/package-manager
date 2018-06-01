const db = require('../util/pghelper');
const logger = require('../util/logger').logger;
const orgpackageversions = require('../api/orgpackageversions');
const push = require('./packagepush');

const SELECT_ALL = `SELECT distinct l.org_id, v.package_id, l.package_version_id, l.status, l.modified_date 
                    FROM license l
                    INNER JOIN package_version v on v.sfid = l.package_version_id`;

let adminJob;

async function fetchSubscribers(orgIds, packageOrgIds, job) {
    adminJob = job;
    
    if (!packageOrgIds) {
        let i = 1;
        let params = orgIds.map(() => `$${i++}`);
        packageOrgIds = (await db.query(
            `SELECT DISTINCT p.package_org_id
                             FROM package p
                             INNER JOIN org_package_version opv on opv.package_id = p.sfid
                             WHERE opv.org_id IN (${params.join(",")})`, orgIds)).map(p => p.package_org_id);
    }

    job.postMessage(`Querying ${packageOrgIds.length} package orgs`);
    let arrs = await push.bulkFindSubscribersByIds(packageOrgIds, orgIds);
    let subs = [];
    for (let i = 0; i < arrs.length; i++) {
        subs = subs.concat(arrs[i]);
    }
    job.postMessage(`Fetched ${subs.length} package subscribers`);
    if (subs.length > 0) {
        let opvs = await orgpackageversions.insertOrgPackageVersionsFromSubscribers(subs);
        job.postMessage(`Updated ${opvs.length} org package versions`);
    }
}

async function fetch(fetchAll, job) {
    adminJob = job;
    
    let sql = SELECT_ALL;
    let values = ['Invalid'];
    let whereParts = [`l.status != $${values.length}`];
    if (!fetchAll) {
        let latest = await db.query(`select max(modified_date) from org_package_version`);
        if (latest.length > 0 && latest[0].max != null) {
            values.push(latest[0].max);
            whereParts.push(`l.modified_date > $${values.length}`);
        }
    }

    let where = ` WHERE ${whereParts.join(" AND ")}`;
    let recs = await db.query(sql + where, values);
    return upsert(recs, 2000);
}

async function upsert(recs, batchSize) {
    let count = recs.length;
    if (count === 0) {
        logger.info("No new org package versions found");
        return;
    }
    logger.info(`New org package versions found`, {count});
    for (let start = 0; start < count && !adminJob.cancelled;) {
        logger.info(`Batch upserting org package versions`, {batch: start, count});
        await upsertBatch(recs.slice(start, start += batchSize));
    }
}

async function upsertBatch(recs) {
    let sql = `INSERT INTO org_package_version(org_id, package_id, package_version_id, license_status, modified_date) VALUES `;
    let values = [];
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;
        values.push(rec.org_id, rec.package_id, rec.package_version_id, rec.status, rec.modified_date);
    }
    sql += ` on conflict (org_id, package_id) do update set
        package_version_id = excluded.package_version_id, license_status = excluded.license_status, modified_date = excluded.modified_date`;
    try {
        await db.insert(sql, values);
    } catch (e) {
        console.error("Failed to insert ", e.message);
    }
}

exports.fetch = fetch;
exports.fetchSubscribers = fetchSubscribers;