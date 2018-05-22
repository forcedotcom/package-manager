'use strict';

const logger = require('../util/logger').logger;
const fetch = require("../worker/fetch");
const subfetch = require("../worker/subfetch");

const jobQueue = [];
const jobSet = new Set();

class AdminJob {
    
}

function requestFetch(req, res, next) {
    try {
        fetch.fetch(req.query.all).then(() => {logger.debug("Finished fetching data", {all: req.query.all})})
            .catch(e => logger.error("Failed to fetch data", {all: req.query.all, error: e.message || e}));
        return res.send({success: true});
    } catch (e) {
        next(e);
    }
}

function requestFetchSubscribers(req, res, next) {
    try {
        subfetch.fetch(req.query.all).then(() => {logger.debug("Finished fetching subscriber data", {all: req.query.all})})
            .catch(e => logger.error("Failed to fetch subscriber data", {all: req.query.all, error: e.message || e}));
        return res.send({success: true});
    } catch (e) {
        next(e);
    }
}

function requestFetchInvalid(req, res, next) {
    try {
        fetch.refetchInvalid().then(() => {logger.debug("Finished fetching invalid orgs")})
            .catch(e => logger.error("Failed to fetch invalid orgs", {error: e.message || e}));
        return res.send({success: true});
    } catch (e) {
        next(e);
    }
}

exports.requestFetch = requestFetch;
exports.requestFetchSubscribers = requestFetchSubscribers;
exports.requestFetchInvalid = requestFetchInvalid;
