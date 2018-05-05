const fs = require('fs');
const path = require('path');
const db = require('../util/pghelper');

async function run() {
    const sqlDir = path.join(__dirname, 'sql');
    const initSqlFiles = fs.readdirSync(sqlDir);
    let errs = [];
    for (let i = 0; i < initSqlFiles.length; i++) {
        let filePath = initSqlFiles[i];
        const data = fs.readFileSync(path.join(sqlDir, filePath), {encoding: 'utf-8'});
        try {
            console.log(data);
            await runScript(filePath, data);
            console.log(`INIT: executed ${filePath}`);
        } catch (err) {
            console.error(`INIT: error in ${filePath}\n${err.message}`);
            errs.push({name: filePath, message: err.message});
        }
    }

    if (errs.length > 0) {
        let ln = 1;
        console.error(`\n===========\n${errs.length} error(s) encountered`);
        console.error(errs.map(err => `  ${ln++}. ${err.name} failed. ${err.message}`).join("\n"));
        console.error(`\n===========\n`);
    } else {
        console.log('Postgres is alive and ready');
    }
}

async function runScript(name, data) {
    try {
        // First check our bootstrap table.
        await db.query("select name from init_script limit 1");
    } catch (error) {
        // Assume the db is empty, so this must be our base init.sql script.  Run it.
        await db.query(data);
    }

    let recs = await db.query("select id from init_script where name = $1 and run_date is null", [name]);
    if (recs.length > 0) {
        // Already executed, skip it.
        return;
    }

    await db.query(data);

    // Log this successful run so we don't run it next time.
    await db.query(`insert into init_script (name, run_date) values ($1, $2)
                    on conflict set run_date = excluded.run_date`, [name, new Date().toISOString()]);

}

//run().then(() => {});