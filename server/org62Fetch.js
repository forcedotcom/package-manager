const sfdc = require('./sfdcconn');

const BASE_PACKAGE_ID = "033A0000000PgEfIAK"; // CPQ package id

async function fetchOrgs(limit) {
    let org62conn = await sfdc.buildOrgConnection(sfdc.ORG62_ID);
    let soql = `SELECT Subscriber_Organization_ID__c,Subscriber_Organization__r.Instance__c, Subscriber_Organization__r.Type,
    Subscriber_Organization__r.OrgStatus,Subscriber_Organization__c, Subscriber_Organization__r.Name, Subscriber_Organization__r.AOV_Band__c
    FROM AppInstall__c WHERE Package_ID__c='${BASE_PACKAGE_ID}' AND Subscriber_Organization__r.Instance__c != null`;
    if (limit) {
        soql += ` limit ${parseInt(limit)}`;
    }
    let res = await org62conn.query(soql);
    return await loadOrgs(res, org62conn);
}

async function fetchMoreOrgs(nextRecordsUrl, conn, orgs) {
    let result = await conn.requestGet(nextRecordsUrl);
    return orgs.concat(await loadOrgs(result, conn));
}

async function loadOrgs(result, conn) {
    let done = {};
    let dupes = {};
    let orgs = result.records.map(v => {
        let org = {
            org_id: v.Subscriber_Organization_ID__c, account_id: v.Subscriber_Organization__c,
            account_name: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.Name : null,
            instance: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.Instance__c : null,
            type: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.Type : null,
            status: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.OrgStatus : null,
            aov_band: v.Subscriber_Organization__c ? v.Subscriber_Organization__r.AOV_Band__c : null
        };
        if (!done[v.Subscriber_Organization_ID__c]) {
            done[v.Subscriber_Organization_ID__c] = org;
            return org;
        } else {
            dupes[v.Subscriber_Organization_ID__c] = {original: done[v.Subscriber_Organization_ID__c], duplicate: org};
            return null;
        }
    });
    orgs = orgs.filter((elem) => elem !== null);
    console.log(`ORG62 FETCH: Found duplicate orgs! ${JSON.stringify(dupes)}`);
    if (!result.done) {
        return fetchMoreOrgs(result.nextRecordsUrl, conn, orgs);
    }
    return orgs;
}

exports.fetchOrgs = fetchOrgs;