const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const SELECT_ALL =
	`SELECT 
		op.org_id, op.license_status,
        pv.id, pv.sfid, pv.name, pv.version_number, pv.version_sort, pv.package_id, pv.release_date, pv.status, pv.version_id, 
        p.package_org_id, p.name as package_name, p.dependency_tier
    FROM org_package_version op 
    INNER JOIN package_version pv on pv.sfid = op.package_version_id
    INNER JOIN package p on p.sfid = op.package_id`;

const SELECT_ALL_IN_ORG_GROUP =
	`${SELECT_ALL} INNER JOIN org_group_member gm ON gm.org_id = op.org_id`;

async function findAll(packageIds, orgGroupIds, excludeVersionIds) {
	let whereParts = [], values = [], select = SELECT_ALL;

	if (packageIds) {
		let params = [];
		for (let i = 1; i <= packageIds.length; i++) {
			params.push('$' + (values.length + i));
		}
		whereParts.push(`op.package_id IN (${params.join(",")})`);
		values = values.concat(packageIds);
	}


	if (orgGroupIds) {
		select = SELECT_ALL_IN_ORG_GROUP;
		let params = [];
		for (let i = 1; i <= orgGroupIds.length; i++) {
			params.push('$' + (values.length + i));
		}

		whereParts.push(`gm.org_group_id IN (${params.join(",")})`);
		values = values.concat(orgGroupIds);
	}

	if (excludeVersionIds) {
		let params = [];
		for (let i = 1; i <= excludeVersionIds.length; i++) {
			params.push('$' + (values.length + i));
		}

		whereParts.push(`pv.version_id NOT IN (${params.join(",")})`);
		values = values.concat(excludeVersionIds);
	}

	let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
	return db.query(select + where, values);
}

async function insertOrgPackageVersions(opvs) {
	let versionIds = opvs.map(r => r.version_id);
	let versions = await db.query(`SELECT sfid, package_id, version_id FROM package_version WHERE version_id IN ('${versionIds.join("','")}')`);
	let versionMap = {};
	for (let i = 0; i < versions.length; i++) {
		let v = versions[i];
		versionMap[v.version_id] = v;
	}

	let params = [], values = [];
	for (let i = 0, n = 1; i < opvs.length; i++) {
		let opv = opvs[i];
		let pv = versionMap[opv.version_id];
		if (!pv) {
			logger.warn("Org found with unknown package version. Could be a beta, or record was deleted from the LMA.  Skipping.", {org_id: opv.org_id, version_id: opv.version_id});
			continue;
		}
		params.push(`($${n++},$${n++},$${n++},$${n++},NOW())`);
		values.push(opv.org_id, pv.package_id, pv.sfid, opv.license_status);
	}

	if (values.length === 0) {
		return [];
	}
	
	let sql = `INSERT INTO org_package_version (org_id, package_id, package_version_id, license_status, modified_date) 
                       VALUES ${params.join(",")}
                       on conflict (org_id, package_id) do update set package_version_id = excluded.package_version_id,
                       license_status = excluded.license_status`;
	return db.insert(sql, values);
}

exports.findAll = findAll;
exports.insertOrgPackageVersions = insertOrgPackageVersions;