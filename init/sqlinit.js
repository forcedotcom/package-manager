const fs = require('fs');
const path = require('path');
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

async function init() {
    const sqlDir = path.join(__dirname, 'sql');

    try {
        const data = fs.readFileSync(path.join(sqlDir, "init.sql"), {encoding: 'utf-8'});
        await db.query(data);
        logger.info('Database is alive and ready');
    } catch (error) {
        logger.error('Database failed to initialize', error);
    }
}

exports.init = init;