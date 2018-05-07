const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const SELECT_ALL = `SELECT DISTINCT org_id, instance, is_sandbox FROM license 
                    WHERE status in ('Trial','Active') 
                    AND instance IS NOT NULL
                    AND (expiration IS NULL OR expiration > DATE 'tomorrow')`;

async function fetch(fetchAll) {
    let fromDate = null;
    if (!fetchAll) {
        let latest = await db.query(`select max(modified_date) from org`);
        if (latest.length > 0) {
            fromDate = latest[0].max;
        }
    }
    let recs = await query(fromDate);
    return upsert(recs, 2000);
}

async function query(fromDate) {
    let select = SELECT_ALL, values = [];
    if (fromDate) {
        values.push(fromDate);
        select += ` AND modified_date > $${values.length}`;
    }
    return await db.query(select, values);
}

async function upsert(recs, batchSize) {
    let count = recs.length;
    if (count === 0) {
        logger.info("No new license orgs found");
        return;
    }
    logger.info(`New license orgs found`, {count});
    if (count <= batchSize) {
        return await upsertBatch(recs);
    }
    for (let start = 0; start < count;) {
        logger.info(`Upserting license orgs`, {batch: start, count: count});
        await upsertBatch(recs.slice(start, start += batchSize));
    }
}

async function upsertBatch(recs) {
    let values = [new Date()];
    let sql = "INSERT INTO org (org_id, instance, is_sandbox, modified_date) VALUES";
    for (let i = 0, n = 2; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++}, $1)`;
        values.push(rec.org_id, rec.instance, rec.is_sandbox);
    }
    sql += ` on conflict (org_id) do update set modified_date = excluded.modified_date`;
    await db.insert(sql, values);
}

exports.fetch = fetch;