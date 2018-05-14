const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const SELECT_ALL = `SELECT distinct l.org_id, v.package_id, l.package_version_id, l.status, l.modified_date 
                    FROM license l
                    INNER JOIN package_version v on v.sfid = l.package_version_id`;

async function fetch(fetchAll) {
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
    for (let start = 0; start < count;) {
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