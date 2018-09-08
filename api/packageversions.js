const db = require('../util/pghelper');

const SELECT_ALL =
	`SELECT 
        pv.id, pv.sfid, pv.name, pv.version_number, pv.version_sort, pv.package_id, pv.release_date, pv.status, pv.version_id, 
        p.package_org_id, p.name as package_name, p.dependency_tier
    FROM package_version pv 
    INNER JOIN package p on p.sfid = pv.package_id`;

const SELECT_ALL_IN_ORG =
	`SELECT
        pv.id, pv.sfid, pv.name, pv.version_number, pv.version_sort, pv.package_id, pv.release_date, pv.status, pv.version_id,
        p.package_org_id, p.name as package_name, p.dependency_tier,
        pvl.version_number latest_version_number, pvl.version_id latest_version_id, pvl.version_sort latest_version_sort, 
        	pvl.limited_version_number latest_limited_version_number, pvl.limited_version_id latest_limited_version_id, pvl.limited_version_sort latest_limited_version_sort,
        op.org_id, op.license_status, op.install_date, op.modified_date,
        o.instance, o.type, o.edition,
        a.account_name
    FROM package_version pv
    INNER JOIN package p on p.sfid = pv.package_id
    INNER JOIN package_version_latest pvl ON pvl.package_id = pv.package_id
    INNER JOIN org_package_version op ON op.version_id = pv.version_id 
    INNER JOIN org o ON o.org_id = op.org_id
    INNER JOIN account a ON a.account_id = o.account_id`;

const SELECT_ALL_IN_ORG_GROUP =
	SELECT_ALL_IN_ORG +
	` INNER JOIN org_group_member gm ON gm.org_id = op.org_id`;

async function requestAll(req, res, next) {
	try {
		let recs = await findAll(
			req.query.sort_field,
			req.query.sort_dir,
			req.query.status,
			req.query.packageIds,
			req.query.packageOrgIds,
			req.query.licensedOrgIds,
			req.query.orgGroupIds);
		return res.send(JSON.stringify(recs));
	} catch (e) {
		next(e);
	}
}

async function findAll(sortField, sortDir, status, packageIds, packageOrgIds, licensedOrgIds, orgGroupIds) {
	let whereParts = [], values = [], select = SELECT_ALL;
	if (status && status !== "All") {
		status = status.split(",");
		let params = status.map((v,i) => '$' + (values.length + i + 1));
		whereParts.push(`pv.status IN (${params.join(",")})`);
		values = values.concat(status);
	}

	if (packageIds) {
		packageIds = packageIds.split(",");
		let params = packageIds.map((v,i) => '$' + (values.length + i + 1));
		whereParts.push(`pv.package_id IN (${params.join(",")})`);
		values = values.concat(packageIds);
	}

	if (packageOrgIds) {
		packageOrgIds = packageOrgIds.split(",");
		let params = packageOrgIds.map((v,i) => '$' + (values.length + i + 1));
		whereParts.push(`p.package_org_id IN (${params.join(",")})`);
		values = values.concat(packageOrgIds);
	}

	if (licensedOrgIds) {
		select = SELECT_ALL_IN_ORG;
		values.push("Active");
		values.push("Trial");
		whereParts.push(`op.license_status IN ($${values.length-1}, $${values.length})`);

		licensedOrgIds = licensedOrgIds.split(",");
		let params = licensedOrgIds.map((v,i) => '$' + (values.length + i + 1));
		whereParts.push(`op.org_id IN (${params.join(",")})`);
		values = values.concat(licensedOrgIds);
	} 
	else if (orgGroupIds) {
		select = SELECT_ALL_IN_ORG_GROUP;
		values.push("Active");
		values.push("Trial");
		whereParts.push(`op.license_status IN ($${values.length-1}, $${values.length})`);

		orgGroupIds = orgGroupIds.split(",");
		let params = orgGroupIds.map((v,i) => '$' + (values.length + i + 1));
		whereParts.push(`gm.org_group_id IN (${params.join(",")})`);
		values = values.concat(orgGroupIds);
	}

	let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
	let orderBy = ` ORDER BY ${sortField === "version_number" ? "version_sort" : sortField || "release_date"} ${sortDir || "desc"}, package_name`;
	return db.query(select + where + orderBy, values);
}

function requestById(req, res, next) {
	const id = req.params.id;
	findByVersionIds([id])
		.then(recs => recs.length === 0 ? next(new Error(`Cannot find any record with id ${id}`)) : res.json(recs[0]))
		.catch(next);
}

async function findByVersionIds(versionIds) {
	const select = SELECT_ALL;
	const params = versionIds.map((v,i) => '$' + (i + 1));
	const where = ` WHERE pv.version_id IN (${params.join(",")})`;
	return db.query(select + where, versionIds);
}

async function findNewerVersions(packageId, versionSort) {
	const select = SELECT_ALL;
	const where = ` WHERE pv.package_id = $1 AND version_sort >= $2`;
	return db.query(select + where, [packageId, versionSort]);
}

exports.requestAll = requestAll;
exports.requestById = requestById;
exports.findByVersionIds = findByVersionIds;
exports.findNewerVersions = findNewerVersions;