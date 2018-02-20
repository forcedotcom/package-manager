const db = require('./pghelper');

const STATUS = {
    Pending: "Pending",
    Connected: "Connected",
    Disconnected: "Disconnected",
    Invalid: "Invalid"
};

const SELECT_ALL =
    "  SELECT id, name, namespace, org_id, instance_url, refresh_token, access_token, username, status "
    + "FROM package_org";

async function findAll(req, res, next) {
    let sort = " ORDER BY " + (req.query.sort || "name");
    try {
        let recs = await db.query(SELECT_ALL + sort, []);
        return res.send(JSON.stringify(recs));
    } catch (err) {
        next(err);
    }
}

async function findById(req, res, next) {
    let id = req.params.id;
    let where = " WHERE id = $1";

    try {
        let recs = await db.query(SELECT_ALL + where, [id]);
        return res.json(recs[0]);
    } catch (err) {
        next(err);
    }
}

async function findByNamespace(req, res, next) {
    let ns = req.params.namespace;
    let where = " WHERE namespace = $1";

    try {
        let recs = await db.query(SELECT_ALL + where, [ns]);
        return res.json(recs[0]);
    } catch (err) {
        next(err);
    }
}


async function createItem(req, res, next) {
    let packageorg = req.body;
    try {
        await createPackageOrg(packageorg.org_id, packageorg.name, packageorg.namespace, packageorg.instance_url, packageorg.username, packageorg.refresh_token, packageorg.access_token);
        return res.send({result: 'ok'});
    } catch (err) {
        return next(err);
    }
}

async function createPackageOrg(org_id, name, namespace, instance_url, username, refresh_token, access_token) {
    await db.query('INSERT INTO package_org (org_id, name, namespace, instance_url, username, refresh_token, access_token, status) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [org_id, name, namespace, instance_url, username, refresh_token, access_token, STATUS.Pending], true);
}

async function updateItem(req, res, next) {
    let po = req.body;
    try {
        await db.query('UPDATE package_org SET org_id=$1, name=$2, namespace=$3, instance_url=$4, ' +
            'username=$5, refresh_token=$6, access_token=$7 WHERE id=$8',
            [po.org_id, po.name, po.namespace, po.instance_url, po.username, po.refresh_token, po.access_token, po.id], true);
        return res.send({result: 'ok'});
    } catch (err) {
        return next(err);
    }
}

async function deleteItem(req, res, next) {
    let id = req.params.id;
    try {
        await db.query('DELETE FROM package_org WHERE id=$1', [id], true);
        return res.send({result: 'ok'});
    } catch (err) {
        return next(err);
    }
}

exports.findAll = findAll;
exports.findById = findById;
exports.findByNamespace = findByNamespace;
exports.createItem = createItem;
exports.createPackageOrg = createPackageOrg;
exports.updateItem = updateItem;
exports.deleteItem = deleteItem;
