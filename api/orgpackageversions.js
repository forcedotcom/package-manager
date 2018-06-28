const db = require('../util/pghelper');

async function insertOrgPackageVersionsFromSubscribers(recs) {
	let versionIds = recs.map(r => r.MetadataPackageVersionId);
	let versions = await db.query(`SELECT sfid, package_id, version_id FROM package_version WHERE version_id IN ('${versionIds.join("','")}')`);
	let versionMap = {};
	for (let i = 0; i < versions.length; i++) {
		let v = versions[i];
		versionMap[v.version_id] = v;
	}

	let params = [], values = [];
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		let pv = versionMap[rec.MetadataPackageVersionId];
		params.push(`($${n++},$${n++},$${n++},$${n++},NOW())`);
		values.push(rec.OrgKey.substring(0, 15), pv.package_id, pv.sfid, "Active");
	}

	let sql = `INSERT INTO org_package_version (org_id, package_id, package_version_id, license_status, modified_date) 
                       VALUES ${params.join(",")}
                       on conflict (org_id, package_id) do update set package_version_id = excluded.package_version_id,
                       license_status = excluded.license_status`;
	return db.insert(sql, values);
}

exports.insertOrgPackageVersionsFromSubscribers = insertOrgPackageVersionsFromSubscribers;