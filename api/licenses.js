const db = require('../util/pghelper');

const QUERY_DICTIONARY = new Map([
	["id", "l.id"],
	["sfid", "l.sfid"],
	["name", "l.name"],
	["nameorg_id", "l.org_id"],
	["status", "l.status"],
	["is_sandbox", "l.is_sandbox"],
	["install_date", "l.install_date"],
	["modified_date", "l.modified_date"],
	["expiration", "l.expiration"],
	["used_license_count", "l.used_license_count"],
	["instance", "o.instance"],
	["account_id", "o.account_id"],
	["account_name", "a.account_name"],
	["package_id", "pv.package_id"],
	["version_name", "pv.name"],
	["version_number", "pv.version_number"],
	["version_sort", "pv.version_sort"],
	["version_id", "pv.version_id"],
	["package_name", "p.name"],
	["lma_org_name", "po.name"],
	["lma_org_id", "po.org_id"]
]);

const SELECT_ALL = `SELECT 
    l.id, l.sfid, l.name, l.org_id, l.status, l.is_sandbox,
    l.install_date, l.modified_date, l.expiration, 
    l.used_license_count,
    o.instance, o.account_id,
    a.account_name,
    pv.package_id, pv.name as version_name, pv.version_number, pv.version_sort, pv.version_id,
    p.name as package_name,
    po.org_id as lma_org_id, po.name as lma_org_name
    FROM license l
    LEFT JOIN org as o on o.org_id = l.org_id
    LEFT JOIN account as a on a.account_id = o.account_id
    INNER JOIN package_version as pv on l.version_id = pv.version_id
    INNER JOIN package as p on pv.package_id = p.sfid
    INNER JOIN package_org as po on p.package_org_id = po.org_id`;

const SELECT_ALL_IN_GROUP = SELECT_ALL +
	` INNER JOIN org_group_member gm ON gm.org_id = o.org_id`;

async function requestAll(req, res, next) {
	let orgId = req.query.org_id;
	let groupId = req.query.group_id;

	findAll(orgId, groupId, req.query.status, req.query.sort_field, req.query.sort_dir,
		req.query.filters ? JSON.parse(req.query.filters) : null, req.query.page, req.query.pageSize)
		.then((recs) => {
			return res.send(JSON.stringify(recs))
		})
		.catch(next);
}

async function findAll(orgId, groupId, status, orderByField, orderByDir, filters) {
	let whereParts = [], values = [];
	let select = SELECT_ALL;

	if (orgId) {
		values.push(orgId);
		whereParts.push("o.org_id = $" + values.length);
	}

	if (groupId) {
		select = SELECT_ALL_IN_GROUP;
		values.push(groupId);
		whereParts.push(`gm.org_group_id = $${values.length}`);
	}

	if (status) {
		values.push(status);
		whereParts.push(`l.status = $${values.length}`)
	}
	
	if (filters && filters.length > 0) {
		whereParts.push(...filter.parseSQLExpressions(QUERY_DICTIONARY, filters));
	}

	let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
	let sort = ` ORDER BY ${orderByField || "name"} ${orderByDir || "asc"}`;

	return db.query(select + where + sort, values);
}

async function requestById(req, res, next) {
	let id = req.params.id;
	let where = " WHERE l.sfid = $1";
	db.query(SELECT_ALL + where, [id])
		.then(recs => recs.length === 0 ? next(new Error(`Cannot find any record with id ${id}`)) : res.json(recs[0]))
		.catch(next);
}

exports.requestAll = requestAll;
exports.requestById = requestById;
