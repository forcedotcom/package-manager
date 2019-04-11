const fs = require('fs');
const path = require('path');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

async function init() {
    const sqlDir = path.join(__dirname, 'sql');

    try {
        const init = fs.readFileSync(path.join(sqlDir, "init.sql"), {encoding: 'utf-8'});
        await db.query(init);

        const migrate = fs.readFileSync(path.join(sqlDir, "migrate.sql"), {encoding: 'utf-8'});
        await db.query(migrate);
        logger.info('Database is alive and ready');
    } catch (error) {
        logger.error('Database failed to initialize', error);
        process.exit(99);
    }
}

exports.init = init;