const sfdc = require('../api/sfdcconn'),
    db = require('../util/pghelper');

const BASE_PACKAGE_ID = "033A0000000PgEfIAK"; // CPQ package id

const SELECT_ALL = `SELECT Subscriber_Organization_ID__c,Subscriber_Organization__r.Instance__c, 
    Subscriber_Organization__r.RecordType.Name, Subscriber_Organization__r.Type,
    Subscriber_Organization__r.OrgStatus,Subscriber_Organization__c, Subscriber_Organization__r.Name
    FROM AppInstall__c WHERE Package_ID__c='${BASE_PACKAGE_ID}' AND Subscriber_Organization__r.Instance__c != null`;

async function fetch(limit) {
    let recs = await query(limit);
    return upsert(recs, 2000);
}

async function query(limit) {
    let conn = await sfdc.buildOrgConnection(sfdc.ORG62_ID);
    let soql = SELECT_ALL;
    if (limit) {
        soql += ` limit ${parseInt(limit)}`;
    }
    let res = await conn.query(soql);
    return load(res, conn);
}

async function fetchMore(nextRecordsUrl, conn, recs) {
    let result = await conn.requestGet(nextRecordsUrl);
    return recs.concat(await load(result, conn));
}

async function load(result, conn) {
    let done = {};
    let dupes = {};
    let recs = result.records.map(v => {
        let rec = {
            org_id: v.Subscriber_Organization_ID__c, account_id: v.Subscriber_Organization__c,
            account_name: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.Name : null,
            instance: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.Instance__c : null,
            type: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.Type : null,
            status: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.OrgStatus : null
        };
        if (!done[v.Subscriber_Organization_ID__c]) {
            done[v.Subscriber_Organization_ID__c] = rec;
            return rec;
        } else {
            dupes[v.Subscriber_Organization_ID__c] = {original: done[v.Subscriber_Organization_ID__c], duplicate: rec};
            return null;
        }
    });
    recs = recs.filter((elem) => elem !== null);
    console.log(`ORG62 FETCH: Found duplicate records! ${JSON.stringify(dupes)}`);
    if (!result.done) {
        return fetchMore(result.nextRecordsUrl, conn, recs);
    }
    return recs;
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
    let sql = "INSERT INTO org (org_id, instance, type, status, account_id, account_name) VALUES";
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
        values.push(rec.org_id, rec.instance, rec.type, rec.status, rec.account_id, rec.account_name);
    }
    sql += ` on conflict (org_id) do update set
        instance = excluded.instance, type = excluded.type, status = excluded.status,
        account_id = excluded.account_id, account_name = excluded.account_name`;
    await db.query(sql, values, false, true);
}

exports.fetch = fetch;