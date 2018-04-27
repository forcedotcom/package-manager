require('dotenv').config();

const orgs = require('./worker/orgfetch');
const ps = require('./worker/packagefetch');
const pvs = require('./worker/packageversionfetch');
const lics = require('./worker/licensefetch');
const licorgs = require('./worker/licenseorgfetch');

async function fetchAll() {
    // await orgs.fetch();
    await ps.fetch();
    await pvs.fetch();
    await pvs.fetchLatest();
    await lics.fetch();
    await licorgs.fetch();
}

async function run()
{
    await fetchAll();
}

run().then(() => {console.log('Done'); process.exit(0)}).catch((e) => {console.error(e); process.exit(1)});
