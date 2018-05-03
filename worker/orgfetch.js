const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');

const SELECT_ALL = `SELECT Id,Name,OrganizationType,Account,Active,LastModifiedDate FROM AllOrganization`;

async function fetch(btOrgId, fetchAll, batchSize = 500) {
    return await queryAndStore(btOrgId, fetchAll, batchSize, false);
}

async function fetchBulk(btOrgId, fetchAll, batchSize = 5000) {
    return await queryAndStore(btOrgId, fetchAll, batchSize, true);
}

async function queryAndStore(btOrgId, fetchAll, batchSize, useBulkAPI) {
    let fromDate = null;
    let sql = `select org_id, modified_date from org`;
    if (!fetchAll) {
        sql += ` where account_id is null order by modified_date desc`
    }
    let orgs = await db.query(sql);
    let count = orgs.length;
    if (count === 0) {
        console.log("No orgs found to update");
        return; 
    }

    if (!fetchAll) {
        fromDate = orgs[0].modified_date;
    }

    let conn = await sfdc.buildOrgConnection(btOrgId);
    for (let start = 0; start < count;) {
        console.log(`Querying ${start} of ${count}`);
        await fetchBatch(conn, orgs.slice(start, start += batchSize), fromDate, useBulkAPI);
    }
}

async function fetchBatch(conn, orgs, fromDate, useBulkAPI) {
    let soql = SELECT_ALL;
    let orgIds = orgs.map(o => o.org_id);

    let orgMap = {};
    for (let i = 0; i < orgs.length; i++) {
        let org = orgs[i];
        orgMap[org.org_id] = org;
    }
    soql += ` WHERE Id IN ('${orgIds.join("','")}')`;
    if (fromDate) {
        soql += ` AND LastModifiedDate > ${fromDate.toISOString()}`;
    }
    let query = (useBulkAPI ? conn.bulk.query(soql) : conn.query(soql))
        .on("record", rec => {
            let org = orgMap[rec.Id.substring(0,15)];
            org.name = rec.Name;
            org.type = rec.OrganizationType;
            org.account_id = rec.Account;
            org.modified_date = new Date(rec.LastModifiedDate).toISOString();
        })
        .on("end", async () => {
            await upsert(orgs, 2000);
        })
        .on("error", err => {
            console.error(err);
        });
    if (!useBulkAPI) {
        await query.run({ autoFetch : true, maxFetch : 100000 });
    }
}

async function upsert(recs, batchSize) {
    let count = recs.length;
    if (count === 0) {
        console.log("No new orgs found");
        return; // nothing to see here
    }
    console.log(`${count} new orgs found`);
    for (let start = 0; start < count;) {
        await upsertBatch(recs.slice(start, start += batchSize));
    }
}

async function upsertBatch(recs) {
    let values = [];
    let sql = "INSERT INTO org (org_id, name, type, modified_date, account_id) VALUES";
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;
        values.push(rec.org_id, rec.name, rec.type, rec.modified_date, rec.account_id);
    }
    sql += ` on conflict (org_id) do update set name = excluded.name, type = excluded.type, modified_date = excluded.modified_date, 
            account_id = excluded.account_id`;
    await db.insert(sql, values);
}

async function mark() {
    let sql = `update org set account_id = '${sfdc.INVALID_ID}', status = 'Not Found', modified_date = now() where account_id is null`;
    let res = await db.update(sql);
    console.log(`Marked ${res.length} org records as invalid accounts`);
}

exports.fetch = fetch;
exports.fetchBulk = fetchBulk;
exports.mark = mark;
