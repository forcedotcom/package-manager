const ps = require('./packagefetch');
const pvs = require('./packageversionfetch');
const licenses = require('./licensefetch');
const licenseorgs = require('./licenseorgfetch');
const orgs = require('./orgfetch');
const orgaccounts = require('./orgaccountfetch');
const accounts = require('./accountfetch');
const sfdc = require('../api/sfdcconn');

async function fetch(fetchAll) {
    try {
        // Packages
        await ps.fetch(fetchAll);
    
        // Package versions - first fetch versions, then use the data to populate latest versions
        await pvs.fetch(fetchAll);
        await pvs.fetchLatest();
        
        // Licenses
        await licenses.fetch(fetchAll);
        
        // Orgs - first populate orgs from licenses, then fill in details from blacktab
        await licenseorgs.fetch(fetchAll);
    } catch (e) {
        console.error('Failed to fetch LMA data', e);
    }


    try {
        await orgs.fetch(sfdc.NamedOrgs.bt.orgId, fetchAll);
        await orgs.fetch(sfdc.NamedOrgs.sbt.orgId, fetchAll);
        await orgs.mark();
    } catch (e) {
        console.error('Failed to fetch org data', e);
    }

    try { // Accounts - first populate accounts from orgs, then fill in details from org62
        await orgaccounts.fetch(fetchAll);
        await accounts.fetch(fetchAll);
    } catch (e) {
        console.error('Failed to fetch account data', e);
    }
}

exports.fetch = fetch;