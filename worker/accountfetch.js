const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');

async function fetch(org62Id, fetchAll, batchSize = 500) {
    return await queryAndStore(org62Id, fetchAll, batchSize, false);
}

async function fetchBulk(org62Id, fetchAll, batchSize = 5000) {
    return await queryAndStore(org62Id, fetchAll, batchSize, true);
}

async function queryAndStore(org62Id, fetchAll, batchSize, useBulkAPI) {
    let fromDate = null;
    let sql = `SELECT account_id, modified_date FROM account WHERE account_id NOT IN($1, $2)`;
    if (!fetchAll) {
        sql += ` AND account_name IS NULL ORDER BY modified_date asc`
    }
    let accounts = await db.query(sql, [sfdc.INVALID_ID, sfdc.INTERNAL_ID]);
    let count = accounts.length;
    if (count === 0) {
        console.log("No accounts found to update");
        return;
    }

    if (!fetchAll) {
        fromDate = accounts[0].modified_date;
    }

    let conn = await sfdc.buildOrgConnection(org62Id);
    for (let start = 0; start < count;) {
        console.log(`Querying ${start} of ${count}`);
        await fetchBatch(conn, accounts.slice(start, start += batchSize), fromDate, useBulkAPI);
    }
}

async function fetchBatch(conn, accounts, fromDate, useBulkAPI) {
    let soql = `SELECT Id, Name, OrgId, LastModifiedDate FROM Account`;
    let accountIds = accounts.map(r => r.account_id);

    let accountMap = {};
    for (let i = 0; i < accounts.length; i++) {
        let account = accounts[i];
        accountMap[account.account_id] = account;
    }
    soql += ` WHERE Id IN ('${accountIds.join("','")}')`;
    if (fromDate) {
        soql += ` AND LastModifiedDate > ${fromDate.toISOString()}`;
    }
    let counter = 0;
    let query = (useBulkAPI ? conn.bulk.query(soql) : conn.query(soql))
        .on("record", rec => {
            counter++;
            let account = accountMap[rec.Id.substring(0,15)];
            account.account_name = rec.Name;
            account.org_id = rec.OrgId ? rec.OrgId.substring(0,15) : null;
            account.modified_date = new Date(rec.LastModifiedDate).toISOString();
        })
        .on("end", async () => {
            console.log(`Found ${counter} accounts in org62`);
            await upsert(accounts, 2000);
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
        console.log("No new records found");
        return; // nothing to see here
    }
    console.log(`${count} new records found`);
    for (let start = 0; start < count;) {
        await upsertBatch(recs.slice(start, start += batchSize));
    }
}

async function upsertBatch(recs) {
    let values = [];
    let sql = "INSERT INTO account (org_id, account_id, account_name, modified_date) VALUES";
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++})`;
        values.push(rec.org_id, rec.account_id, rec.account_name, rec.modified_date);
    }
    sql += ` on conflict (account_id) do update set account_name = excluded.account_name, org_id = excluded.org_id, 
                modified_date = excluded.modified_date`;
    await db.insert(sql, values);
}

async function mark() {
    let sql = `update account set status = 'Not Found' where account_name is null`;
    let res = await db.update(sql);
    console.log(`Marked ${res.length} records as invalid accounts`);
}

exports.fetch = fetch;
exports.fetchBulk = fetchBulk;
exports.mark = mark;
