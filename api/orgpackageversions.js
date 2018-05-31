const db = require('../util/pghelper');
const push = require('../worker/packagepush');
const admin = require('../api/admin');
const packageorgs = require('../api/packageorgs');


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
        params.push(`($${n++},$${n++},$${n++},$${n++},$${n++})`);
        values.push(rec.OrgKey.substring(0,15), pv.package_id, pv.sfid, "None", new Date().toISOString());
    }

    let sql = `INSERT INTO org_package_version (org_id, package_id, package_version_id, license_status, modified_date) 
                       VALUES ${params.join(",")}
                       on conflict (org_id, package_id) do update set package_version_id = excluded.package_version_id`;
    return db.insert(sql, values);
}

function fetchOrgPackageVersions(orgIds, packageOrgIds) {
    return new admin.AdminJob("refresh-versions", "Fetch package versions installed on orgs",
        [
            {
                name: "Fetching invalid production orgs",
                handler: async (job) => {
                    if (!packageOrgIds) {
                        let i = 1;
                        let params = orgIds.map(v => `$${i++}`);
                        packageOrgIds = (await db.query(
                            `SELECT DISTINCT p.package_org_id
                             FROM package p
                             INNER JOIN org_package_version opv on opv.package_id = p.sfid
                             WHERE opv.org_id IN (${params.join(",")})`, orgIds)).map(p => p.package_org_id);
                    }

                    job.postMessage(`Querying ${packageOrgIds.length} package orgs`);
                    let arrs = await push.bulkFindSubscribersByIds(packageOrgIds, orgIds);
                    let subs = [];
                    for (let i = 0; i < arrs.length; i++) {
                        subs = subs.concat(arrs[i]);
                    }
                    job.postMessage(`Fetched ${subs.length} package subscribers`);
                    if (subs.length > 0) {
                        let opvs = await insertOrgPackageVersionsFromSubscribers(subs);
                        job.postMessage(`Updated ${opvs.length} org package versions`);
                    }
                },
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.bt.orgId, packageorgs.Status.Invalid);
                    }
                }
            }
        ]);
}

exports.insertOrgPackageVersionsFromSubscribers = insertOrgPackageVersionsFromSubscribers;
exports.fetchOrgPackageVersions = fetchOrgPackageVersions;