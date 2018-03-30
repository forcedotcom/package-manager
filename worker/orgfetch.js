const sfdc = require('../api/sfdcconn'),
    db = require('../util/pghelper');

const BASE_PACKAGE_ID = "033A0000000PgEfIAK"; // CPQ package id

const SELECT_ALL = `SELECT LastModifiedDate, Subscriber_Organization_ID__c,Subscriber_Organization__r.Instance__c, 
    Subscriber_Organization__r.RecordType.Name, Subscriber_Organization__r.Type,
    Subscriber_Organization__r.OrgStatus,Subscriber_Organization__c, Subscriber_Organization__r.Name
    FROM AppInstall__c WHERE Package_ID__c='${BASE_PACKAGE_ID}' AND Subscriber_Organization__r.Instance__c != null`;

async function fetchAll() {
    return fetchFrom();
}

async function fetch(limit) {
    let fromDate = null;
    let latest = await db.query(`select max(modified_date) from org`);
    if (latest.length > 0) {
        fromDate = latest[0].max;
    }
    return fetchFrom(fromDate, limit);
}

async function fetchFrom(fromDate, limit) {
    let recs = await query(fromDate, limit);
    return upsert(recs, 2000);
}

async function query(fromDate, limit) {
    let conn = await sfdc.buildOrgConnection(sfdc.ORG62_ID);
    let soql = SELECT_ALL;
    if (fromDate) {
        soql += ` AND LastModifiedDate > ${fromDate.toISOString()}`;
    }
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
    let dupes;
    let recs = result.records.map(v => {
        let rec = {
            org_id: v.Subscriber_Organization_ID__c,
            account_id: v.Subscriber_Organization__c,
            modified_date: new Date(v.LastModifiedDate).toISOString(),
            account_name: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.Name : null,
            instance: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.Instance__c : null,
            type: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.Type : null,
            status: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.OrgStatus : null
        };
        if (!done[v.Subscriber_Organization_ID__c]) {
            done[v.Subscriber_Organization_ID__c] = rec;
            return rec;
        } else {
            dupes = dupes || {};
            dupes[v.Subscriber_Organization_ID__c] = {original: done[v.Subscriber_Organization_ID__c], duplicate: rec};
            return null;
        }
    });
    recs = recs.filter((elem) => elem !== null);
    if (dupes) {
        console.log(`ORG62 fetched duplicate records, ignored: ${JSON.stringify(dupes)}`);
    }

    if (!result.done) {
        return fetchMore(result.nextRecordsUrl, conn, recs);
    }
    return recs;
}

async function upsert(recs, batchSize) {
    let count = recs.length;
    if (count === 0) {
        console.log("No new orgs found in org62")
        return; // nothing to see here
    }
    console.log(`${count} new orgs found in org62`)
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
    let sql = "INSERT INTO org (org_id, instance, modified_date, type, status, account_id, account_name) VALUES";
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
        values.push(rec.org_id, rec.instance, rec.modified_date, rec.type, rec.status, rec.account_id, rec.account_name);
    }
    sql += ` on conflict (org_id) do update set
        instance = excluded.instance, modified_date = excluded.modified_date, type = excluded.type, status = excluded.status,
        account_id = excluded.account_id, account_name = excluded.account_name`;
    await db.insert(sql, values);
}

exports.fetch = fetch;