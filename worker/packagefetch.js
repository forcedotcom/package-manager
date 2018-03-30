const sfdc = require('../api/sfdcconn'),
    db = require('../util/pghelper');

const SELECT_ALL = `SELECT Id, Name, sflma__Developer_Org_ID__c, sfLma__Package_ID__c FROM sflma__Package__c`;

async function fetch(limit) {
    let recs = await query(limit);
    return upsert(recs, 2000);
}

async function query(limit) {
    let conn = await sfdc.buildOrgConnection(sfdc.SB62_ID);
    let soql = SELECT_ALL;
    if (limit) {
        soql += ` limit ${parseInt(limit)}`;
    }
    let res = await conn.query(soql);
    return await load(res, conn);
}

async function fetchMore(nextRecordsUrl, conn, recs) {
    let result = await conn.requestGet(nextRecordsUrl);
    return recs.concat(await load(result, conn));
}

async function load(result, conn) {
    let recs = result.records.map(v => {
        return {sfid: v.Id, name: v.Name, package_org_id: v.sfLma__Developer_Org_ID__c, package_id: v.sfLma__Package_ID__c};
    });
    if (!result.done) {
        return fetchMore(result.nextRecordsUrl, conn, recs);
    }
    return recs;
}

async function upsert(recs, batchSize) {
    let count = recs.length;
    if (count === 0) {
        console.log("No packages found in SB62");
        return; // nothing to see here
    }
    console.log(`${count} packages found in SB62`);
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
    let sql = "INSERT INTO package (sfid, name, package_org_id, package_id) VALUES";
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++})`;
        values.push(rec.sfid, rec.name, rec.package_org_id, rec.package_id);
    }
    sql += ` on conflict (sfid) do update set
        name = excluded.name, package_org_id = excluded.package_org_id, package_id = excluded.package_id`;
    await db.insert(sql, values);
}

exports.fetch = fetch;