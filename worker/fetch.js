const ps = require('./packagefetch');
const pvs = require('./packageversionfetch');
const licenses = require('./licensefetch');
const licenseorgs = require('./licenseorgfetch');
const orgs = require('./orgfetch');
const orgaccounts = require('./orgaccountfetch');
const accounts = require('./accountfetch');
const sfdc = require('../api/sfdcconn');

const packageorgs = require('../api/packageorgs');

async function fetch(fetchAll) {
    try {
        // Packages
        await ps.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll);
    
        // Package versions - first fetch versions, then use the data to populate latest versions
        await pvs.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll);
        await pvs.fetchLatest();
        
        // Licenses
        await licenses.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll);
        
        // Orgs - first populate orgs from licenses, then fill in details from blacktab
        await licenseorgs.fetch(fetchAll);
    } catch (e) {
        console.error('Failed to fetch LMA data', e);
        if (e.name === "invalid_grant") {
            packageorgs.updateOrgStatus(sfdc.NamedOrgs.sb62.orgId, packageorgs.Status.Invalid);
        }

    }

    try {
        await orgs.fetch(sfdc.NamedOrgs.bt.orgId, fetchAll);
        await orgs.mark(false);
    } catch (e) {
        console.error('Failed to fetch production org data', e);
        if (e.name === "invalid_grant") {
            packageorgs.updateOrgStatus(sfdc.NamedOrgs.bt.orgId, packageorgs.Status.Invalid);
        }
    }

    try {
        await orgs.fetch(sfdc.NamedOrgs.sbt.orgId, fetchAll);
        await orgs.mark(true);
    } catch (e) {
        console.error('Failed to fetch sandbox org data', e);
        if (e.name === "invalid_grant") {
            packageorgs.updateOrgStatus(sfdc.NamedOrgs.sbt.orgId, packageorgs.Status.Invalid);
        }
    }

    try { // Accounts - first populate accounts from orgs, then fill in details from org62
        await orgaccounts.fetch(fetchAll);
        await accounts.fetch(sfdc.NamedOrgs.org62.orgId, fetchAll);
    } catch (e) {
        console.error('Failed to fetch account data', e);
        if (e.name === "invalid_grant") {
            packageorgs.updateOrgStatus(sfdc.NamedOrgs.org62.orgId, packageorgs.Status.Invalid);
        }
    }
}

exports.fetch = fetch;