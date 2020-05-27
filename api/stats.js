const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

async function requestStats(req, res, next) {
    try {
        let ids = req.query.upgradeIds;
        const stats = await db.query(`SELECT stats.name,stats.status, count(*) FROM 
(SELECT package.name AS name, upgrade_job.status AS status
FROM upgrade_job 
JOIN upgrade_item ON upgrade_job.item_id = upgrade_item.id 
JOIN package_version ON upgrade_item.version_id = package_version.version_id
JOIN package ON package_version.package_id = package.sfid
WHERE upgrade_job.upgrade_id IN (${ids}) 
GROUP BY package.name,upgrade_job.status,org_id) AS stats 
GROUP BY stats.name,stats.status`);

        res.json(stats);
    } catch (e) {
        next(e);
    }
}

exports.requestStats = requestStats;