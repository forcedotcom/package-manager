const db = require('../util/pghelper');

const SELECT_ALL = `SELECT 
    l.id, l.sfid, l.name, l.org_id, l.status, l.is_sandbox,
    l.install_date, l.modified_date, l.expiration, 
    l.used_license_count, l.package_version_id, 
    o.instance, o.account_id,
    a.account_name,
    pv.package_id, pv.name as version_name, pv.version_number, pv.version_id,
    p.name as package_name
    FROM license l
    INNER JOIN org as o on l.org_id = o.org_id
    INNER JOIN account as a on o.account_id = a.account_id
    INNER JOIN package_version as pv on l.package_version_id = pv.sfid
    INNER JOIN package as p on pv.package_id = p.sfid`;

function requestAll(req, res, next) {
	let orgId = req.query.org_id;

	findAll(orgId, req.query.status, req.query.sort_field, req.query.sort_dir)
		.then((recs) => {
			return res.send(JSON.stringify(recs))
		})
		.catch(next);
}

async function findAll(orgId, status, orderByField, orderByDir) {
	let whereParts = ["o.instance IS NOT NULL"],
		values = [];

	if (orgId) {
		values.push(orgId);
		whereParts.push("o.org_id = $" + values.length);
	}

	if (status) {
		values.push(status);
		whereParts.push(`l.status = $${values.length}`)
	}

	let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
	let sort = ` ORDER BY ${orderByField || "name"} ${orderByDir || "asc"}`;

	return db.query(SELECT_ALL + where + sort, values);
}

function requestById(req, res, next) {
	let id = req.params.id;

	let where = " WHERE l.sfid = $1";

	db.query(SELECT_ALL + where, [id])
		.then((recs) => {
			return res.json(recs[0])
		})
		.catch(next);
}

exports.requestAll = requestAll;
exports.requestById = requestById;