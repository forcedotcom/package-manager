const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

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

exports.insertOrgPackageVersions = insertOrgPackageVersions;