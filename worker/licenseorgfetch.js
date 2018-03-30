const db = require('../util/pghelper');

// const SELECT_ALL = `SELECT DISTINCT sflma__subscriber_org_id__c AS org_id, sflma__org_instance__c AS instance FROM sflma__license__c`;
const SELECT_ALL = `SELECT DISTINCT org_id, instance, modified_date, status FROM license 
                    WHERE status in ('Trial','Active') 
                    AND instance IS NOT NULL
                    AND (expiration IS NULL OR expiration > DATE 'tomorrow')`;

async function fetchAll() {
    return fetchFrom();
}

async function fetch() {
    let fromDate = null;
    let latest = await db.query(`select max(modified_date) from org`);
    if (latest.length > 0) {
        fromDate = latest[0].max;
    }
    return fetchFrom(fromDate);
}

async function fetchFrom(fromDate) {
    let recs = await query(fromDate);
    return upsert(recs, 2000);
}

async function query(fromDate) {
    let select = SELECT_ALL, values = [];
    if (fromDate) {
        select += ` AND modified_date > $1`;
        values.push(fromDate);
    }
    return await db.query(select, values);
}

async function upsert(recs, batchSize) {
    let count = recs.length;
    if (count === 0) {
        console.log("No new license orgs found");
        return;
    }
    console.log(`${count} new license orgs found`);
    if (count <= batchSize) {
        return await upsertBatch(recs);
    }
    for (let start = 0; start < count;) {
        console.log(`Batching ${start} of ${count}`);
        await upsertBatch(recs.slice(start, start += batchSize));
    }
}

async function upsertBatch(recs) {
    let values = [];
    let sql = "INSERT INTO org (org_id, instance, modified_date, status) VALUES";
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++})`;
        values.push(rec.org_id, rec.instance, rec.modified_date, rec.status.toUpperCase());
    }
    sql += ` on conflict do nothing`;
    await db.insert(sql, values);
}

exports.fetch = fetch;
exports.fetchAll = fetchAll;