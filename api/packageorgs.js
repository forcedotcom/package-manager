const db = require('../util/pghelper');
const crypt = require('../util/crypt');
const sfdc = require('./sfdcconn');

const CRYPT_KEY = process.env.CRYPT_KEY || "supercalifragolisticexpialodocious";

const SELECT_ALL =
    "  SELECT id, name, division, namespace, org_id, instance_name, instance_url, refresh_token, access_token "
    + "FROM public.package_org";

async function requestAll(req, res, next) {
    let sort = ` ORDER BY ${req.query.sort_field || "name"} ${req.query.sort_dir || "asc"}`;
    try {
        let recs = await db.query(SELECT_ALL + sort, []);
        await crypt.passwordDecryptObjects(CRYPT_KEY, recs, ['access_token', 'refresh_token']);
        return res.send(JSON.stringify(recs));
    } catch (err) {
        next(err);
    }
}

async function requestById(req, res, next) {
    let id = req.params.id;
    try {
        let rec = await retrieveByOrgId(id);
        return res.json(rec);
    } catch (err) {
        next(err);
    }
}

async function retrieve(id) {
    let where = " WHERE id = $1";
    let recs = await db.query(SELECT_ALL + where, [id]);
    await crypt.passwordDecryptObjects(CRYPT_KEY, recs, ['access_token', 'refresh_token']);
    return recs[0];
}

async function retrieveByOrgId(org_id) {
    let where = " WHERE org_id = $1";
    let recs = await db.query(SELECT_ALL + where, [org_id]);
    await crypt.passwordDecryptObjects(CRYPT_KEY, recs, ['access_token', 'refresh_token']);
    return recs[0];
}

async function initOrg(conn, org_id) {
    let org = await refresh(conn, org_id);
    let encrypto = {access_token: conn.accessToken, refresh_token: conn.refreshToken};
    await crypt.passwordEncryptObjects(CRYPT_KEY, [encrypto]);
    let sql = `INSERT INTO package_org 
                (org_id, name, division, namespace, instance_name, instance_url, refresh_token, access_token)
               VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8)
               on conflict (org_id) do update set
                name = excluded.name, division = excluded.division, namespace = excluded.namespace, instance_name = excluded.instance_name, 
                instance_url = excluded.instance_url, refresh_token = excluded.refresh_token, access_token = excluded.access_token`;
    return await db.insert(sql,
        [org_id, org.Name, org.Division, org.NamespacePrefix, org.InstanceName, conn.instanceUrl, encrypto.refresh_token, encrypto.access_token]);
}

async function refresh(conn, org_id) {
    try {
        return await conn.sobject("Organization").retrieve(org_id);
    } catch (e) {
        // No access to the Organization object?  No worries.  Our token was still refreshed.
        return {Id: org_id, Name: conn.instanceUrl, Division: null, NamespacePrefix: null, InstanceName: null};
    }
}

async function updateAccessToken(org_id, access_token) {
    let encrypto = {access_token: access_token};
    await crypt.passwordEncryptObjects(CRYPT_KEY, [encrypto]);
    await db.update(`UPDATE package_org set access_token = $1 WHERE org_id = $2`, [encrypto.access_token, org_id]);
}

async function requestDelete(req, res, next) {
    try {
        let orgIds = req.body.orgIds;
        let n = 1;
        let params = orgIds.map(v => `$${n++}`);
        await db.delete(`DELETE FROM package_org WHERE org_id IN (${params.join(",")})`, orgIds);
        return res.send({result: 'ok'});
    } catch (err) {
        return next(err);
    }
}

async function requestRefresh(req, res, next) {
    try {
        let orgs = [];
        let orgIds = req.body.orgIds;
        for (let i = 0; i < orgIds.length; i++) {
            let orgId = orgIds[i];
            let conn = await sfdc.buildOrgConnection(orgId);
            let recs = await initOrg(conn, orgId);
            orgs.push(recs[0]);
        }
        await crypt.passwordDecryptObjects(CRYPT_KEY, orgs, ['access_token', 'refresh_token']);
        return res.json(orgs);
    } catch (err) {
        return next(err);
    }
}

exports.requestAll = requestAll;
exports.requestById = requestById;
exports.requestRefresh = requestRefresh;
exports.requestDelete = requestDelete;
exports.retrieveById = retrieve;
exports.retrieveByOrgId = retrieveByOrgId;
exports.initOrg = initOrg;
exports.updateAccessToken = updateAccessToken;
