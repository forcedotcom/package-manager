const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const parseXML = require('xml2js').parseString;
const soap = require('../util/soap');

async function fetchAll(packageOrgId, limit) {
    return fetchFrom(packageOrgId, limit);
}

async function fetch(packageOrgId, limit) {
    let fromDate = null;
    let latest = await db.query(`select max(modified_date) from org`);
    if (latest.length > 0) {
        fromDate = latest[0].max;
    }
    return fetchFrom(packageOrgId, fromDate, limit);
}

async function fetchFrom(packageOrgId, fromDate, limit) {
    let recs = await query(packageOrgId, fromDate, limit);
    return upsert(recs, 2000);
}

async function query(packageOrgId, fromDate, limit) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    // Just pinging the connection here to ensure the oauth access token is fresh (because our soap call below won't do it for us).
    let count = await countActiveRequests(conn);
    console.log(`Active requests? ${count}`);

    let soql = "SELECT Id, OrgName, InstalledStatus, InstanceName, OrgStatus, OrgType, MetadataPackageVersionId, OrgKey FROM PackageSubscriber";
    if (fromDate) {
        soql += ` AND LastModifiedDate > ${fromDate.toISOString()}`;
    }
    if (limit) {
        soql += `LIMIT ${limit}`;
    }
    try {
        let res = await soap.invoke(conn, "query", {queryString: soql});
        let result = soap.getResponseBody(res).result;
        return load(result, conn);
    } catch (e) {
        parseXML(e.message, function (err, result) {
            let error = soap.parseError(result);
            console.error(error.message);
        });
    }
}

async function countActiveRequests(conn) {
    let soql = `SELECT Id FROM PackagePushRequest WHERE Status IN ('In Progress', 'Pending')`;
    let res = await conn.query(soql);
    return res.records.length;
}

async function fetchMore(nextRecordsUrl, conn, recs) {
    let result = await conn.requestGet(nextRecordsUrl);
    return recs.concat(await load(result, conn));
}

async function load(result, conn) {
    let recs = result.records.map(v => {
        let rec = {
            org_id: v["sf:OrgKey"],
            org_name: v["sf:OrgName"],
            org_type: v["sf:OrgType"],
            org_status: v["sf:OrgStatus"],
            instance: v["sf:InstanceName"],
            version_id: v["sf:MetadataPackageVersionId"]
        };
        return rec;
    });

    if (!result.done) {
        return fetchMore(result.nextRecordsUrl, conn, recs);
    }
    return recs;
}

async function upsert(recs, batchSize) {
    let count = recs.length;
    if (count === 0) {
        console.log("No new orgs found")
        return; // nothing to see here
    }
    console.log(`${count} new orgs found`)
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
    let sql = "INSERT INTO org (org_id, instance, account_name) VALUES";
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++})`;
        values.push(rec.org_id, rec.instance, rec.org_name);
    }
    sql += ` on conflict (org_id) do nothing`;
    await db.insert(sql, values);
}

exports.fetch = fetch;
exports.fetchAll = fetchAll;