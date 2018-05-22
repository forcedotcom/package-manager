const db = require('../util/pghelper');
const push = require('../worker/packagepush');
const logger = require('../util/logger').logger;
const orgs = require('../api/orgs');


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

const SUBSCRIBER_FETCH_BATCH_SIZE = 40; // we have to batch, until the PackageSubscriber API can scale without timing out.
async function refreshOrgPackageVersions(packageOrgId, orgIds) {
    let batchSize = SUBSCRIBER_FETCH_BATCH_SIZE;
    for (let start = 0; start < count;) {
        logger.debug(`Refreshing subscriber info`, {batch: start, count});
        let batchIds = orgIds.slice(start, start + batchSize);
        let subs;
        try {
            subs = await push.findSubscribersByIds([packageOrgId], batchIds);
            start += batchSize;
        } catch (e) {
            if (batchSize * 4 <= SUBSCRIBER_FETCH_BATCH_SIZE) {
                console.error("Failed to fetch subscribers", {org_id: packageOrgId, batch_size: batchSize})
            } 
            batchSize = batchSize / 2;
            continue;
        }
        await insertOrgPackageVersionsFromSubscribers(subs);
    }
}

async function asyncRefreshOrgPackageVersionsByGroup(groupId, packageOrgIds) {
    packageOrgIds = packageOrgIds || (await db.query(
            `SELECT DISTINCT p.package_org_id
            FROM package p
            INNER JOIN org_package_version opv on opv.package_id = p.sfid
            INNER JOIN org_group_member m on m.org_id = opv.org_id
            where m.org_group_id = $1`, [groupId])).map(p => p.package_org_id);
    
    let orgIds = (await orgs.findByGroup(groupId)).map(o => o.org_id);
    
    push.bulkFindSubscribersByIds(packageOrgIds, orgIds, (subs, error) => {
        if (error) {
            logger.error("Failed to query org package versions", {error: error.message || error});
            return;
        }
        
        if (subs.length === 0) {
            logger.info("No subscriber orgs found in group", {group: groupId, packageOrgIds: packageOrgIds.join(",")});
            return;
        }
        
        insertOrgPackageVersionsFromSubscribers(subs)
            .then(recs => logger.debug("Updated org package versions", {count: recs.length}))
            .catch(e => logger.error("Failed to store org package versions", {error: e.message || e}));
    });
}

async function asyncRefreshOrgPackageVersions(orgIds, packageOrgIds) {
    push.bulkFindSubscribersByIds(packageOrgIds, orgIds, (subs, error) => {
        if (error) {
            logger.error("Failed to query org package versions", {error: error.message || error});
            return;
        }
        
        insertOrgPackageVersionsFromSubscribers(subs)
            .then(recs => logger.debug("Updated org package versions", {count: recs.length}))
            .catch(e => logger.error("Failed to store org package versions", {error: e.message || e}));
    });
}

exports.insertOrgPackageVersionsFromSubscribers = insertOrgPackageVersionsFromSubscribers;
exports.refreshOrgPackageVersionsByGroup = asyncRefreshOrgPackageVersionsByGroup;
exports.refreshOrgPackageVersions = asyncRefreshOrgPackageVersions; // refreshOrgPackageVersions