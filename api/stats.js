const db = require('../util/pghelper');
const logger = require('../util/logger').logger;


const SELECT_UPGRADE_STATUS = `SELECT package.name AS name, upgrade_job.status AS status
FROM upgrade_job 
JOIN upgrade_item ON upgrade_job.item_id = upgrade_item.id 
JOIN package_version ON upgrade_item.version_id = package_version.version_id
JOIN package ON package_version.package_id = package.sfid `;

const GROUP_BY_PACKAGE_ORG_STATUS = `GROUP BY package.name, upgrade_job.status, org_id `;
const GROUP_BY_STATS_STATUS = `GROUP BY stats.name,stats.status `;
const AS_STATS_TABLE = `AS stats `
const SELECT_STATS_COUNT = `SELECT stats.name,stats.status, count(*) FROM `;

async function requestStats(req, res, next) {
    try {
        let ids = req.query.upgradeIds;
        const where = `WHERE upgrade_job.upgrade_id IN (${ids})`
        const stats = await db.query(SELECT_STATS_COUNT + '(' +SELECT_UPGRADE_STATUS + where + GROUP_BY_PACKAGE_ORG_STATUS + ')' + AS_STATS_TABLE + GROUP_BY_STATS_STATUS);
        res.json(stats);
    } catch (e) {
        next(e);
    }
}

exports.requestStats = requestStats;