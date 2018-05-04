const fs = require('fs'),
    path = require('path'),
    db = require('../util/pghelper');

const filePath = path.join(__dirname, '../init.sql');

fs.readFile(filePath, {encoding: 'utf-8'}, async function (err, data) {
    if (err) {
        return console.error(err);
    }

    try {
        await db.query("select id from upgrade limit 1");
        console.log('Postgres is alive and ready');
    } catch (error) {
        // Assume we haven't initialized yet.
        try {
            await db.query(data);
            console.log('Postgres tables successfully initialized');
            
            // Now insert any seed data we need.
            await db.insert(`insert into account (account_name, account_id) values ('Internal', '000000000000000')`);
        } catch (error) {
            console.error('Error initializing Postgres tables initialized');
            console.error(error)
        }
    }
});