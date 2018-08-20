const db = require('../util/pghelper');

const SELECT_ALL = `SELECT id, sfid, name, package_org_id, package_id, dependency_tier
	  				FROM package`;

async function requestAll(req, res, next) {
	let orgId = req.query.org_id;

	try {
		let recs = await findAll(orgId, req.query.sort_field, req.query.sort_dir);
		return res.send(JSON.stringify(recs));
	} catch (err) {
		next(err);
	}
}

async function findAll(orgId, sortField, sortDir) {
	let whereParts = [],
		values = [];

	if (orgId) {
		values.push(orgId);
		whereParts.push("org_id = $" + values.length);
	}

	let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
	let sort = ` ORDER BY ${sortField || "dependency_tier"} ${sortDir || "asc"}`;

	return await db.query(SELECT_ALL + where + sort, values);
}

function requestById(req, res, next) {
	let id = req.params.id;
	let where = " WHERE " + ((typeof id === "string") ? "sfid = $1" : "id = $1");

	db.query(SELECT_ALL + where, [id])
	.then(recs => recs.length === 0 ? next(new Error(`Cannot find any record with id ${id}`)) : res.json(recs[0]))
	.catch (next);
}

exports.requestAll = requestAll;
exports.findAll = findAll;
exports.requestById = requestById;