const db = require('./pghelper');
const crypt = require('./crypt');

const CRYPT_KEY = process.env.CRYPT_KEY || "supercalifragolisticexpialodocious";

const SELECT_ALL =
    "  SELECT id, name, namespace, org_id, instance_name, instance_url, refresh_token, access_token "
    + "FROM package_org";

async function requestAll(req, res, next) {
    let sort = " ORDER BY " + (req.query.sort || "name");
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
        let rec = await retrieve(id);
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

async function create(org_id, name, namespace, instance_name, instance_url, refresh_token, access_token) {
    let encrypto = {access_token:access_token, refresh_token:refresh_token};
    await crypt.passwordEncryptObjects(CRYPT_KEY, [encrypto]);
    await db.query('INSERT INTO package_org (org_id, name, namespace, instance_name, instance_url, refresh_token, access_token) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [org_id, name, namespace, instance_name, instance_url, encrypto.refresh_token, encrypto.access_token], true);
}

async function update(id, org_id, name, namespace, instance_name, instance_url, refresh_token, access_token) {
    let encrypto = {access_token:access_token, refresh_token:refresh_token};
    await crypt.passwordEncryptObjects(CRYPT_KEY, [encrypto]);
    await db.query('UPDATE package_org SET org_id=$1, name=$2, namespace=$3, instance_name=$4, instance_url=$5, ' +
        'refresh_token=$6, access_token=$7 WHERE id=$8',
        [org_id, name, namespace, instance_name, instance_url, encrypto.refresh_token, encrypto.access_token, id], true);
}

async function requestDelete(req, res, next) {
    let id = req.params.id;
    try {
        await db.query('DELETE FROM package_org WHERE id=$1', [id], true);
        return res.send({result: 'ok'});
    } catch (err) {
        return next(err);
    }
}

exports.requestAll = requestAll;
exports.requestById = requestById;
exports.retrieveById = retrieve;
exports.requestDeleteById = requestDelete;
exports.updatePackageOrg = update;
exports.createPackageOrg = create;
