const sfdc = require('../api/sfdcconn');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

async function fetchByIds(packageOrgId, orgIds) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);
    let soql = `SELECT Id, OrgName, InstalledStatus, InstanceName, OrgStatus, 
    OrgType, MetadataPackageVersionId, OrgKey FROM PackageSubscriber
    WHERE OrgKey IN ('${orgIds.join("','")}')`;
    let res = await conn.query(soql);
    return load(res, conn);
}

async function fetchAll(packageOrgId, limit) {
    if (!packageOrgId) {
        return fetchFromAllOrgs();
    }
    return fetch(packageOrgId, null, null, limit);
}

async function fetchFromAllOrgs() {
    let conns = {};
    let recs = [];
    let orgVersions = await db.query(`SELECT distinct o.org_id, p.name package_name, v.major_version 
                                FROM package_org o 
                                INNER JOIN package p ON p.package_org_id = o.org_id
                                INNER JOIN package_version v ON v.package_id = p.sfid
                                ORDER BY package_name, major_version asc`);
    for (let i = 0; i < orgVersions.length; i++) {
        let orgVersion = orgVersions[i];
        let conn = conns[orgVersion.org_id] = conns[orgVersion.org_id] || await sfdc.buildOrgConnection(orgVersion.org_id);
        process.stdout.write(`Fetching major version ${orgVersion.major_version} of ${orgVersion.package_name}... `);
        let sandboxes = await query(conn, orgVersion.org_id, orgVersion.major_version, "Sandbox");
        process.stdout.write(`${sandboxes.length} sandbox, `);
        recs = recs.concat(sandboxes);
        const prods = await query(conn, orgVersion.org_id, orgVersion.major_version, "Production");
        process.stdout.write(`${prods.length} prod\n`);
        recs = recs.concat(prods);
    }
    return upsert(recs, 2000);
}

async function fetch(packageOrgId, majorVersions, type, limit) {
    let recs = await queryVersions(packageOrgId, majorVersions, limit);
    return upsert(recs, 2000);
}

async function queryVersions(packageOrgId, majorVersions, limit) {
    let conn = await sfdc.buildOrgConnection(packageOrgId);

    let recs = [];
    if (majorVersions) {
        for (let i = 0; i < majorVersions.length; i++) {
            recs = recs.concat(await query(conn, packageOrgId, majorVersions[i], type, limit));
        }
    } else {
        recs = await query(conn, packageOrgId, null, type, limit);
    }
    return recs;    
}

async function query(conn, packageOrgId, majorVersion, orgType, limit) {
    let whereParts = [];
    let values = [];

    values.push(packageOrgId);
    whereParts.push(`p.package_org_id = $${values.length}`);
    
    if (majorVersion) {
        values.push(`${majorVersion}.%`);
        whereParts.push(`v.version_number like $${values.length}`);
    }
    let where = ` WHERE ${whereParts.join(" AND ")}`;
    let versions = await db.query(`SELECT v.version_id FROM package_version v
        INNER JOIN package p on p.sfid = v.package_id ${where}`, values);

    whereParts = ["OrgStatus IN ('Active', 'Demo')", "InstalledStatus = 'i'"];
    if (orgType && ["Production", "Sandbox"].indexOf(orgType) !== -1) {
        whereParts.push(`OrgType = '${orgType}'`);
    }
    
    let soql = "SELECT Id, OrgName, InstalledStatus, InstanceName, OrgStatus, OrgType, MetadataPackageVersionId, OrgKey FROM PackageSubscriber";
    if (versions.length > 0) {
        let params = [];
        for (let i = 0; i < versions.length; i++) {
            params.push(`'${versions[i].version_id}'`);
        }
        whereParts.push(`MetadataPackageVersionId IN (${params.join(",")})`);
    }
    
    soql += ` WHERE ${whereParts.join(" AND ")}`;
    if (limit) {
        soql += `LIMIT ${limit}`;
    }
    let res = await conn.query(soql);
    return load(res, conn);
}

async function fetchMore(nextRecordsUrl, conn, recs) {
    let result = await conn.requestGet(nextRecordsUrl);
    return recs.concat(await load(result, conn));
}

async function load(result, conn) {
    let recs = result.records.map(v => {
        let rec = {
            org_id: v.OrgKey,
            org_name: v.OrgName,
            org_type: v.OrgType,
            org_status: v.OrgStatus,
            instance: v.InstanceName,
            version_id: v.MetadataPackageVersionId
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
        logger.info("No new orgs found")
        return; // nothing to see here
    }
    logger.info(`New subscriber orgs found`, {count})
    if (count <= batchSize) {
        return await upsertBatch(recs);
    }
    for (let start = 0; start < count;) {
        logger.info(`Batch upserting subscriber orgs`, {batch: start, count});
        await upsertBatch(recs.slice(start, start += batchSize));
    }
}

async function upsertBatch(recs) {
    let values = [];
    let sql = "INSERT INTO org (org_id, instance, name) VALUES";
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

exports.fetchAll = fetchAll;
exports.fetchByIds = fetchByIds;