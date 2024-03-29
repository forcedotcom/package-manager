const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const SELECT_ALL =
	`SELECT 
		op.org_id, op.license_status,
        pv.id, pv.sfid, pv.name, pv.version_number, pv.version_sort, pv.package_id, pv.release_date, pv.status, pv.version_id, 
        p.package_org_id, p.name as package_name, p.dependency_tier
    FROM org_package_version op 
    INNER JOIN package_version pv on pv.version_id = op.version_id
    INNER JOIN package p on p.sfid = op.package_id`;

const SELECT_ALL_IN_ORG_GROUP =
	`${SELECT_ALL} INNER JOIN org_group_member gm ON gm.org_id = op.org_id`;

const LicenseStatus = {
	Active: "Active",
	Trial: "Trial",
	Suspended: "Suspended",
	Uninstalled: "Uninstalled",
	Expired: "Expired",
	NotFound: "Not Found"
};

async function findAll(packageIds, orgGroupIds, excludeVersionIds, status) {
	let whereParts = [], values = [], select = SELECT_ALL;

	if (status && status.length > 0) {
		let params = status.map((v,i) => '$' + (values.length + i + 1));
		whereParts.push(`op.license_status IN (${params.join(",")})`);
		values = values.concat(status);
	}

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
		params.push(`($${n++},$${n++},$${n++},$${n++},$${n++})`);
		values.push(opv.org_id, pv.package_id, pv.version_id, opv.license_status, opv.modified_date);
	}

	if (values.length === 0) {
		return [];
	}
	
	let sql = `INSERT INTO org_package_version (org_id, package_id, version_id, license_status, modified_date) 
                       VALUES ${params.join(",")}
                       on conflict (org_id, package_id) do update set version_id = excluded.version_id,
                       license_status = excluded.license_status, modified_date = excluded.modified_date`;
	return db.insert(sql, values);
}

async function updateOrgPackageVersions(opvs, batchSize = 2000) {
	const count = opvs.length;
	for (let start = 0; start < count;) {
		try {
			await updateOrgPackageVersionsBatch(opvs.slice(start, start += batchSize));
		} catch (e) {
			logger.error(e);
		}
	}
}

async function updateOrgPackageVersionsBatch(opvs) {
	let n = 0;
	let params = [];
	let values = [];
	opvs.forEach(v => {
		params.push(`($${++n},$${++n},$${++n})`);
		values.push(v.package_id,v.version_id,v.org_id);
	});
	let sql = `UPDATE org_package_version as t SET version_id = v.version_id
			FROM ( VALUES ${params.join(",")} ) as v(package_id, version_id, org_id)
			WHERE v.org_id = t.org_id AND v.package_id = t.package_id`;
	await db.update(sql, values);
}

/**
 * Flip expired orgs to Expired and non-expired orgs to their license status
 */
async function updateFromLicenseStatus() {
	await db.update(`
		UPDATE org_package_version opv
		SET install_date = l.install_date,
			license_status =
				CASE
					WHEN l.expiration <= NOW() THEN 'Expired'
					ELSE l.status
					END
		FROM license l
		WHERE l.org_id = opv.org_id AND l.version_id = opv.version_id`);
}

/**
 * Invalidate all existing org package versions when we are upserting all new findings
 */
async function updateStatus(packageId, status) {
	await db.update(
		`UPDATE org_package_version set license_status = $1 WHERE package_id = $2`, [status, packageId]);
}

exports.LicenseStatus = LicenseStatus;
exports.findAll = findAll;
exports.insertOrgPackageVersions = insertOrgPackageVersions;
exports.updateOrgPackageVersions = updateOrgPackageVersions;
exports.updateFromLicenseStatus = updateFromLicenseStatus;
exports.updateStatus = updateStatus;
