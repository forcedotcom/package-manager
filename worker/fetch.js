const ps = require('./packagefetch');
const pvs = require('./packageversionfetch');
const licenses = require('./licensefetch');
const licenseorgs = require('./licenseorgfetch');
const orgs = require('./orgfetch');
const orgaccounts = require('./orgaccountfetch');
const accounts = require('./accountfetch');
const sfdc = require('../api/sfdcconn');
const logger = require('../util/logger').logger;

const packageorgs = require('../api/packageorgs');

async function fetch(fetchAll) {
    try {
        logger.info(`=== Fetching${fetchAll ? ' All ' : ' '}Data ===`);
        // Packages
        await ps.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll);
    
        // Package versions - first fetch versions, then use the data to populate latest versions
        await pvs.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll);
        await pvs.fetchLatest();
        
        // Licenses
        await licenses.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll);
        
        // Orgs - first populate orgs from licenses, then fill in details from blacktab
        await licenseorgs.fetch(fetchAll);
    } catch (error) {
        logger.error('Failed to fetch LMA data', {error: error.message, stack: error.stack});
        if (error.name === "invalid_grant") {
            packageorgs.updateOrgStatus(sfdc.NamedOrgs.sb62.orgId, packageorgs.Status.Invalid);
        }

    }

    try {
        await orgs.fetch(sfdc.NamedOrgs.bt.orgId, fetchAll);
        await orgs.fetch(sfdc.NamedOrgs.gs0bt.orgId, fetchAll);
        await orgs.mark(false);
    } catch (error) {
        logger.error('Failed to fetch production org data', error);
        if (error.name === "invalid_grant") {
            packageorgs.updateOrgStatus(sfdc.NamedOrgs.bt.orgId, packageorgs.Status.Invalid);
        }
    }

    try {
        await orgs.fetch(sfdc.NamedOrgs.sbt.orgId, fetchAll);
        await orgs.mark(true);
    } catch (error) {
        logger.error('Failed to fetch sandbox org data', error);
        if (error.name === "invalid_grant") {
            packageorgs.updateOrgStatus(sfdc.NamedOrgs.sbt.orgId, packageorgs.Status.Invalid);
        }
    }

    try { 
        // Accounts - first populate accounts from orgs, then fill in details from org62
        await orgaccounts.fetch(fetchAll);
        await accounts.fetch(sfdc.NamedOrgs.org62.orgId, fetchAll);
    } catch (error) {
        logger.error('Failed to fetch account data', error);
        if (error.name === "invalid_grant") {
            packageorgs.updateOrgStatus(sfdc.NamedOrgs.org62.orgId, packageorgs.Status.Invalid);
        }
    }
    logger.info("=== Done ===")
}


/**
 * Fetch all orgs again, ignoring modified dates
 * @returns {Promise<void>}
 */
async function refetch() {
    this.fetch(true);
}

/**
 * Fetch all orgs marked previously as invalid, in case any fell through the cracks before, or became valid again.
 * @returns {Promise<void>}
 */
async function refetchInvalid() {
    logger.info(`=== Fetching Invalid Org Data ===`);
    try {
        await orgs.refetchInvalid(sfdc.NamedOrgs.bt.orgId);
        await orgs.refetchInvalid(sfdc.NamedOrgs.gs0bt.orgId);
        await orgs.mark(false);
    } catch (error) {
        logger.error('Failed to fetch production org data', error);
        if (error.name === "invalid_grant") {
            packageorgs.updateOrgStatus(sfdc.NamedOrgs.bt.orgId, packageorgs.Status.Invalid);
        }
    }

    try {
        await orgs.refetchInvalid(sfdc.NamedOrgs.sbt.orgId);
        await orgs.mark(true);
    } catch (error) {
        logger.error('Failed to fetch sandbox org data', error);
        if (error.name === "invalid_grant") {
            packageorgs.updateOrgStatus(sfdc.NamedOrgs.sbt.orgId, packageorgs.Status.Invalid);
        }
    }

    try { 
        // Accounts - first populate accounts from orgs, then fill in details from org62
        await orgaccounts.fetch();
        await accounts.fetch(sfdc.NamedOrgs.org62.orgId);
    } catch (error) {
        logger.error('Failed to fetch account data', error);
        if (error.name === "invalid_grant") {
            packageorgs.updateOrgStatus(sfdc.NamedOrgs.org62.orgId, packageorgs.Status.Invalid);
        }
    }
    logger.info("=== Done ===")
}

exports.fetch = fetch;
exports.refetch = refetch;
exports.refetchInvalid = refetchInvalid;
