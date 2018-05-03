require('dotenv').config();

const ps = require('./worker/packagefetch');
const pvs = require('./worker/packageversionfetch');
const licenses = require('./worker/licensefetch');
const licenseorgs = require('./worker/licenseorgfetch');
const orgs = require('./worker/orgfetch');
const orgaccounts = require('./worker/orgaccountfetch');
const accounts = require('./worker/accountfetch');
const sfdc = require('./api/sfdcconn');

async function fetch() {
    // Packages
    await ps.fetch();
    
    // Package versions - first fetch versions, then use the data to populate latest versions
    await pvs.fetch();
    await pvs.fetchLatest();

    // Licenses
    await licenses.fetch();
    
    // Orgs - first populate orgs from licenses, then fill in details from blacktab
    await licenseorgs.fetch();
    await orgs.fetch(sfdc.BT_ID);
    await orgs.fetch(sfdc.BTSB_ID);
    await orgs.mark();

    // Accounts - first populate accounts from orgs, then fill in details from org62
    await orgaccounts.fetch();
    await accounts.fetch();
}

async function run() {
    try {
        await fetch();
    } catch (e) {
        console.error(e);
    }
}

run().then(() => {console.log('Done'); process.exit(0)}).catch((e) => {console.error(e); process.exit(1)});
