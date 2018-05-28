const ps = require('./packagefetch');
const pvs = require('./packageversionfetch');
const licenses = require('./licensefetch');
const licenseorgs = require('./licenseorgfetch');
const orgs = require('./orgfetch');
const orgaccounts = require('./orgaccountfetch');
const accounts = require('./accountfetch');
const sfdc = require('../api/sfdcconn');
const orgpackageversions = require('./orgpackageversionfetch');
const admin = require('../api/admin');

const packageorgs = require('../api/packageorgs');

function fetch(fetchAll) {
    return new admin.AdminJob( 
        fetchAll ? "fetch-all" : "fetch-latest",
        fetchAll ? "Fetch all data" : "Fetch latest data", 
        [
            {
                name: "Populating license data",
                steps: [
                    {name: "Fetching packages", handler: () => ps.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll)},
                    {name: "Fetching package versions", handler: () => pvs.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll)},
                    {name: "Fetching latest package versions", handler: () => pvs.fetchLatest()},

                    {name: "Fetching licenses", handler: () => licenses.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll)},
                    {name: "Invalidating conflicting licenses", handler: () => licenses.markInvalid()},
                    {name: "Deriving orgs from licenses", handler: () => licenseorgs.fetch(fetchAll)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.sb62.orgId, packageorgs.Status.Invalid);
                    }
                }
            },
            {
                name: "Populating production org data",
                steps: [
                    {name: "Fetching production orgs", handler: () => orgs.fetch(sfdc.NamedOrgs.bt.orgId, fetchAll)},
                    {name: "Invalidating missing production orgs", handler: () => orgs.mark(false)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.bt.orgId, packageorgs.Status.Invalid);
                    }
                }
            }, 
            {
                name: "Populating sandbox org data",
                steps: [
                    {name: "Fetching sandbox orgs", handler: () => orgs.fetch(sfdc.NamedOrgs.sbt.orgId, fetchAll)},
                    {name: "Invalidating missing sandbox orgs", handler: () => orgs.mark(true)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.sbt.orgId, packageorgs.Status.Invalid);
                    }
                }
            },
            {
                name: "Populating org package versions",
                steps: [
                    {
                        name: "Deriving org package versions from licenses",
                        handler: () => orgpackageversions.fetch(fetchAll)
                    }]
            },
            {
                name: "Populating accounts data",
                steps: [
                    {name: "Deriving accounts from orgs", handler: () => orgaccounts.fetch(fetchAll)},
                    {name: "Fetching account names", handler: () => accounts.fetch(sfdc.NamedOrgs.org62.orgId, fetchAll)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.org62.orgId, packageorgs.Status.Invalid);
                    }
                }
            }
        ]);
}

/**
 * Fetch all orgs marked previously as invalid, in case any fell through the cracks before, or became valid again.
 * @returns {Promise<void>}
 */
function fetchInvalid() {
    return new admin.AdminJob("fetch-invalid", "Fetch invalid org data", 
        [
            {
                name: "Populating production org data",
                steps: [
                    {name: "Fetching invalid production orgs", handler: () => orgs.refetchInvalid(sfdc.NamedOrgs.bt.orgId)},
                    {name: "Invalidating missing production orgs", handler: () => orgs.mark(false)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.bt.orgId, packageorgs.Status.Invalid);
                    }
                }
            },
            {
                name: "Populating sandbox org data",
                steps: [
                    {name: "Fetching invalid sandbox orgs", handler: () => orgs.fetch(sfdc.NamedOrgs.sbt.orgId)},
                    {name: "Invalidating missing sandbox orgs", handler: () => orgs.mark(true)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.sbt.orgId, packageorgs.Status.Invalid);
                    }
                }
            },
            {
                name: "Populating accounts data",
                steps: [
                    {name: "Deriving accounts from orgs", handler: () => orgaccounts.fetch(true)},
                    {name: "Fetching account names", handler: () => accounts.fetch(sfdc.NamedOrgs.org62.orgId, true)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.org62.orgId, packageorgs.Status.Invalid);
                    }
                }
            }
        ]);
}

exports.fetch = fetch;
exports.fetchInvalid = fetchInvalid;
