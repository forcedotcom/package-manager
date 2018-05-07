const fs = require('fs');
const path = require('path');
const db = require('../util/pghelper');

async function init() {
    const sqlDir = path.join(__dirname, 'sql');

    try {
        const data = fs.readFileSync(path.join(sqlDir, "init.sql"), {encoding: 'utf-8'});
        await db.query(data);
        console.log('Database is alive and ready');
    } catch (e) {
        console.error('Database failed to initialize', e.message);
    }
}

exports.init = init;