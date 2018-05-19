'use strict';

const fetch = require("../worker/fetch");

async function requestFetch(req, res, next) {
    try {
        await fetch.fetch(req.query.all);
        return res.send({success: true});
    } catch (e) {
        next(e);
    }
}

async function requestFetchInvalid(req, res, next) {
    try {
        await fetch.refetchInvalid();
        return res.send({success: true});
    } catch (e) {
        next(e);
    }
}

exports.requestFetch = requestFetch;
exports.requestFetchInvalid = requestFetchInvalid;
