const db = require('../util/pghelper');
const sfdc = require('../api/sfdcconn');

const SELECT_ALL = `SELECT DISTINCT account_id FROM org WHERE account_id is not null 
                    AND account_id NOT IN('${sfdc.INVALID_ID}', '${sfdc.INTERNAL_ID}')`;

async function fetch(fetchAll) {
    let fromDate = null;
    if(!fetchAll) {
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
        console.log("No new org accounts found");
        return;
    }
    console.log(`${count} new org accounts found`);
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
    let sql = "INSERT INTO account (account_id) VALUES";
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++})`;
        values.push(rec.account_id);
    }
    sql += ` on conflict (account_id) do nothing`;
    await db.insert(sql, values);
}

exports.fetch = fetch;