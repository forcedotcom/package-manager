const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const moment = require('moment');

const SELECT_ALL = `SELECT Id, LastModifiedDate, Name, sfLma__Subscriber_Org_ID__c, sfLma__Org_Instance__c, sfLma__License_Type__c, 
    sfLma__Subscriber_Org_Is_Sandbox__c, sfLma__Status__c, sfLma__Install_Date__c, sfLma__Expiration__c, 
    sfLma__Used_Licenses__c, sfLma__Package__c, sfLma__Package_Version__c FROM sfLma__License__c`;

async function fetch(limit) {
    let recs = await query(limit);
    return upsert(recs, 2000);
}

async function query(limit) {
    let conn = await sfdc.buildOrgConnection(sfdc.SB62_ID);
    let soql = SELECT_ALL;
    let from = moment().subtract(10, 'days');
    soql += ` WHERE LastModifiedDate > ${from.toISOString()}`;
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
        return {
            sfid: v.Id,
            name: v.Name,
            org_id: v.sfLma__Subscriber_Org_ID__c,
            instance: v.sfLma__Org_Instance__c,
            type: v.sfLma__License_Type__c,
            is_sandbox: v.sfLma__Subscriber_Org_Is_Sandbox__c,
            status: v.sfLma__Status__c,
            install_date: v.sfLma__Install_Date__c,
            expiration: v.sfLma__Expiration__c,
            used_license_count: v.sfLma__Used_Licenses__c,
            package_id: v.sfLma__Package__c,
            package_version_id: v.sfLma__Package_Version__c
        };
    });
    if (!result.done) {
        return fetchMore(result.nextRecordsUrl, conn, recs);
    }
    return recs;
}

async function upsert(recs, batchSize) {
    if (recs.length <= batchSize) {
        console.log(`Upserting ${recs.length}`);
        return await upsertBatch(recs);
    }
    let count = recs.length;
    for (let start = 0; start < count;) {
        console.log(`Batch upserting ${Math.min(start+batchSize,count)} of ${count}`);
        await upsertBatch(recs.slice(start, start += batchSize));
    }
}

async function upsertBatch(recs) {
    let values = [];
    let sql = "INSERT INTO license (sfid, name, org_id, instance, type, is_sandbox, status, install_date, expiration, used_license_count, package_id, package_version_id) VALUES";
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
        values.push(rec.sfid, rec.name, rec.org_id, rec.instance, rec.type, rec.is_sandbox, rec.status, rec.install_date,
            rec.expiration, rec.used_license_count, rec.package_id, rec.package_version_id);
    }
    sql += ` on conflict (sfid) do update set
        name = excluded.name, org_id = excluded.org_id, instance = excluded.instance, type = excluded.type, 
        is_sandbox = excluded.is_sandbox, status = excluded.status, install_date = excluded.install_date,
        expiration = excluded.expiration, used_license_count = excluded.used_license_count,
        package_id = excluded.package_id, package_version_id = excluded.package_version_id`;
    await db.query(sql, values, false, true);
}

exports.fetch = fetch;