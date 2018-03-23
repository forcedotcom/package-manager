const db = require('../util/pghelper');

// const SELECT_ALL = `SELECT DISTINCT sflma__subscriber_org_id__c AS org_id, sflma__org_instance__c AS instance FROM sflma__license__c`;
const SELECT_ALL = `SELECT DISTINCT org_id, instance, status FROM license 
                    WHERE status in ('Trial','Active') 
                    AND instance IS NOT NULL
                    AND (expiration IS NULL OR expiration > DATE 'tomorrow')`;

async function fetch(limit) {
    let recs = await query(limit);
    return upsert(recs, 2000);
}

async function query(limit) {
    return await db.query(SELECT_ALL + (parseInt(limit) || ""), [])
}

async function upsert(recs, batchSize) {
    if (recs.length <= batchSize) {
        return await upsertBatch(recs);
    }
    let count = recs.length;
    for (let start = 0; start < count;) {
        console.log(`Batching ${start} of ${count}`);
        await upsertBatch(recs.slice(start, start += batchSize));
    }
}

async function upsertBatch(recs) {
    let values = [];
    let sql = "INSERT INTO org (org_id, instance, status) VALUES";
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++})`;
        values.push(rec.org_id, rec.instance, rec.status.toUpperCase());
    }
    sql += ` on conflict do nothing`;
    await db.query(sql, values, false, true);
}

exports.fetch = fetch;