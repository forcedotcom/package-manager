const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const SELECT_ALL = `SELECT Id,Name,OrganizationType,Account,Active,LastModifiedDate FROM AllOrganization`;

const Status = {NotFound: 'Not Found'};
const QUERY_BATCH_SIZE = 500;

let adminJob;

async function fetch(btOrgId, fetchAll, job) {
    adminJob = job;
    return await queryAndStore(btOrgId, fetchAll, false, false);
}

async function refetchInvalid(btOrgId, job) {
    adminJob = job;
    return await queryAndStore(btOrgId, false, true, false);
}

async function queryAndStore(btOrgId, fetchAll, fetchInvalid) {
    let conn = await sfdc.buildOrgConnection(btOrgId);
    let sql = `select org_id, modified_date from org`;
    if (fetchInvalid) {
        sql += ` where status = '${Status.NotFound}'`
    } else if (!fetchAll) {
        sql += ` where account_id is null order by modified_date desc`
    }
    let orgs = await db.query(sql);
    let count = orgs.length;
    if (count === 0) {
        logger.info("No orgs found to update");
        // Ping the org anyway, to keep our love (and, session) alive.
        await conn.query(SELECT_ALL + ' LIMIT 1');
        return; 
    }

    for (let start = 0; start < count && !adminJob.cancelled;) {
        logger.info(`Retrieving org records`, {batch: start, count});
        await fetchBatch(conn, orgs.slice(start, start += QUERY_BATCH_SIZE));
    }
}

async function fetchBatch(conn, orgs) {
    let soql = SELECT_ALL;
    let orgIds = orgs.map(o => o.org_id);

    let orgMap = {};
    for (let i = 0; i < orgs.length; i++) {
        let org = orgs[i];
        orgMap[org.org_id] = org;
    }
    soql += ` WHERE Id IN ('${orgIds.join("','")}')`;
    let updated = [];
    let query = conn.query(soql)
        .on("record", rec => {
            let org = orgMap[rec.Id.substring(0,15)];
            org.name = rec.Name;
            org.type = rec.OrganizationType;
            org.account_id = rec.Account;
            org.modified_date = new Date(rec.LastModifiedDate).toISOString();
            updated.push(org);
        })
        .on("end", async () => {
            await upsert(updated, 2000);
        })
        .on("error", error => {
            logger.error("Failed to retrieve orgs", error);
        });
    
    await query.run({autoFetch: true, maxFetch: 100000});
}

async function upsert(recs, batchSize) {
    let count = recs.length;
    if (count === 0) {
        logger.info("No new orgs found in batch");
        return; // nothing to see here
    }
    logger.info(`Upserting orgs found in batch`, {count});
    for (let start = 0; start < count;) {
        await upsertBatch(recs.slice(start, start += batchSize));
    }
}

async function upsertBatch(recs) {
    let values = [];
    let sql = "INSERT INTO org (org_id, name, type, modified_date, account_id, status) VALUES";
    for (let i = 0, n = 1; i < recs.length; i++) {
        let rec = recs[i];
        if (i > 0) {
            sql += ','
        }
        sql += `($${n++},$${n++},$${n++},$${n++},$${n++}, null)`;
        values.push(rec.org_id, rec.name, rec.type, rec.modified_date, rec.account_id);
    }
    sql += ` on conflict (org_id) do update set name = excluded.name, type = excluded.type, modified_date = excluded.modified_date, 
            account_id = excluded.account_id, status = null`;
    await db.insert(sql, values);
}

async function mark(isSandbox) {
    let sql = `update org set account_id = $1, status = '${Status.NotFound}', modified_date = now() where account_id is null
                and is_sandbox = $2`;
    let res = await db.update(sql, [sfdc.INVALID_ID, isSandbox]);
    if (res.length > 0) {
        logger.info(`Marked org records as invalid accounts`, {count: res.length});
    }
}

exports.fetch = fetch;
exports.refetchInvalid = refetchInvalid;
exports.mark = mark;
