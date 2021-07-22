const db = require('../util/pghelper');
const logger = require('../util/logger').logger;


const SELECT_UPGRADE_STATUS = `SELECT stats.name,stats.status, count(*) FROM (SELECT package.name AS name, upgrade_job.status AS status
FROM upgrade_job 
JOIN upgrade_item ON upgrade_job.item_id = upgrade_item.id 
JOIN package_version ON upgrade_item.version_id = package_version.version_id
JOIN package ON package_version.package_id = package.sfid `;
const GROUP_BY_PKG_NAME_STATUS = `GROUP BY package.name, upgrade_job.status,org_id) AS stats GROUP BY stats.name,stats.status`;

async function requestStats(req, res, next) {
    try {
        let ids = req.body.upgradeIds;
        let n = 1;
        let params = ids.map(() => `$${n++}`);
        const WHERE = `WHERE upgrade_job.upgrade_id IN (${params.join(",")})` ;
        const stats = await db.query(SELECT_UPGRADE_STATUS + WHERE + GROUP_BY_PKG_NAME_STATUS, ids);
        return res.json(stats);
    } catch (e) {
        next(e);
    }
}

async function requestAll(req, res, next) {
    try {
        let ids = req.body.upgradeIds;
        let n = 1;
        let params = ids.map(() => `$${n++}`);
        const WHERE = `WHERE upgrade_job.upgrade_id IN (${params.join(",")})` ;
        const stats = await db.query(SELECT_UPGRADE_STATUS + WHERE + GROUP_BY_PKG_NAME_STATUS, ids);
        return res.json(stats);
    } catch (e) {
        next(e);
    }

	return {'gus_reference' : 'W-123456', 'date': '2021-06-25', 'failed': 17, 'ineligible': 1, 'succeeded': 375}
}

exports.requestStats = requestStats;
exports.requestAll = requestAll;