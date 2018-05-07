const sfdc = require('../api/sfdcconn'),
    db = require('../util/pghelper');

const SELECT_ALL = `SELECT Id, Name, sfLma__Version_Number__c, sfLma__Package__c, sfLma__Release_Date__c, Status__c, 
                    sfLma__Version_ID__c, RealVersionNumber__c, LastModifiedDate FROM sfLma__Package_Version__c`;

async function fetch(sb62Id, fetchAll) {
    let fromDate = null;
    if (!fetchAll) {
        let latest = await db.query(`select max(modified_date) from package_version`);
        if (latest.length > 0) {
            fromDate = latest[0].max;
        }
    }

    let recs = await query(sb62Id, fromDate);
    return upsert(recs, 2000);
}

async function query(sb62Id, fromDate) {
    let conn = await sfdc.buildOrgConnection(sb62Id);
    let soql = SELECT_ALL;
    if (fromDate) {
        soql += ` WHERE LastModifiedDate > ${fromDate.toISOString()}`;
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
            version_number: v.sfLma__Version_Number__c,
            real_version_number: v.RealVersionNumber__c,
            major_version: v.sfLma__Version_Number__c ? v.sfLma__Version_Number__c.split(".")[0] : null,
            package_id: v.sfLma__Package__c,
            release_date: new Date(v.sfLma__Release_Date__c).toISOString(),
            modified_date: new Date(v.LastModifiedDate).toISOString(),
            status: v.Status__c,
            version_id: v.sfLma__Version_ID__c
        };
    });
    if (!result.done) {
        return fetchMore(result.nextRecordsUrl, conn, recs);
    }
    return recs;
}

async function upsert(recs, batchSize) {
    let count = recs.length;
    if (count === 0) {
        console.log("No new package versions found");
        return; // nothing to see here
    }
    console.log(`${count} new package versions found`);
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
    let sql = `INSERT INTO package_version (sfid, name, version_number, real_version_number, major_version, package_id,
               release_date, modified_date, status, version_id) VALUES `;
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`;
        values.push(rec.sfid, rec.name, rec.version_number, rec.real_version_number, rec.major_version, rec.package_id,
            rec.release_date, rec.modified_date, rec.status, rec.version_id);
    }
    sql += ` on conflict (sfid) do update set
        name = excluded.name, version_number = excluded.version_number, real_version_number = excluded.real_version_number, major_version = excluded.major_version,
        package_id = excluded.package_id, release_date = excluded.release_date, modified_date = excluded.modified_date, 
        status = excluded.status, version_id = excluded.version_id`;
    await db.insert(sql, values);
}

async function fetchLatest() {
    let recs = await queryLatest();
    return upsertLatest(recs);
}

async function queryLatest(packageIds) {
    let whereParts = ["real_version_number != '-1'"], values = [];

    if (packageIds) {
        let params = [];
        for (let i = 1; i <= packageIds.length; i++) {
            params.push('$' + i);
        }
        whereParts.push(`package_id IN (${params.join(",")})`);
    }

    let where = whereParts.length > 0 ? ` WHERE ${whereParts.join(" AND ")}` : "";

    let sql = `SELECT v.package_id, v.sfid, v.version_id, v.name, v.version_number FROM
        (SELECT package_id, MAX(real_version_number) real_version_number FROM package_version
         ${where} 
         GROUP BY package_id) x
        INNER JOIN package_version v ON v.package_id = x.package_id AND v.real_version_number = x.real_version_number`;

    console.log(sql);
    return db.query(sql, values);
}

async function upsertLatest(recs) {
    let values = [];
    let sql = `INSERT INTO package_version_latest (package_id, sfid, version_id, name, version_number) VALUES `;
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;
        values.push(rec.package_id, rec.sfid, rec.version_id, rec.name, rec.version_number);
    }
    sql += ` on conflict (package_id) do update set
        sfid = excluded.sfid, version_id = excluded.version_id, name = excluded.name, version_number = excluded.version_number`;
    await db.insert(sql, values);
}

exports.fetch = fetch;
exports.fetchLatest = fetchLatest;
exports.upsert = upsert;