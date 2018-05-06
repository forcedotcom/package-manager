'use strict';

const sfdc = require("../api/sfdcconn");
const orgfetch = require("../worker/orgfetch");

async function requestFetch(req, res, next) {
    try {
        await orgfetch.fetchBulk(sfdc.NamedOrgs.sbt.orgId);
        return res.send({success: true});
    } catch (e) {
        next(e);
    }
}

exports.requestFetch = requestFetch;
