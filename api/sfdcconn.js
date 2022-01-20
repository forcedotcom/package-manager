'use strict';

const jsforce = require('jsforce');
const packageorgs = require('./packageorgs');
const logger = require("../util/logger").logger;

const OrgTypes = {
	Accounts: "Accounts",
	Licenses: "Licenses",
	Package: "Package"
};

const AccountIDs = {
    Internal: '000000000000000',
    Invalid: '000000000000001'
};

const PORT = process.env.PORT || 5000;
const SFDC_API_VERSION = "52.0";

const CALLBACK_URL = (process.env.LOCAL_URL || 'http://localhost:' + PORT) + '/oauth2/callback';

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const TRACE_FUNCTIONS = ["query", "sobject", "retrieve", "insert", "update", "upsert"];

function buildConnection(accessToken, refreshToken, instanceUrl, apiVersion = SFDC_API_VERSION) {
	const target = new jsforce.Connection({
			oauth2: {
				clientId: CLIENT_ID,
				clientSecret: CLIENT_SECRET,
				redirectUri: CALLBACK_URL
			},
			version: apiVersion,
			instanceUrl: instanceUrl,
			accessToken: accessToken,
			refreshToken: refreshToken,
			logLevel: process.env.LOG_LEVEL || "WARN"
		}
	);
	// Support advanced debug tracing for specific functions
	return (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") ?
		new Proxy(target, {
			get(target, propKey, receiver) {
				const targetValue = Reflect.get(target, propKey, receiver);
				if (typeof targetValue === 'function' && TRACE_FUNCTIONS.indexOf(propKey) !== -1) {
					return function (...args) {
						logger.debug(`[SFDC::${propKey}]`, {instanceUrl, ...args});
						return targetValue.apply(this, args);
					}
				} else {
					return targetValue;
				}
			}
		}) : target;
}

async function buildOrgConnection(packageOrgId, apiVersion) {
	let orgs = await packageorgs.secureRetrieveByOrgIds([packageOrgId]);
	if (orgs.length === 0) {
		throw `No such package org with id ${packageOrgId}`;
	}
	let packageOrg = orgs[0];
	let conn = buildConnection(packageOrg.access_token, packageOrg.refresh_token, packageOrg.instance_url, apiVersion);
	conn.on("refresh", async (accessToken, res) => {
		packageOrg.accessToken = accessToken;
		await packageorgs.updateAccessToken(packageOrgId, accessToken);
	});

	conn.queryWithRetry = async (soql) => {
		try {
			return await conn.query(soql);
		} catch (e) {
			if (e.errorCode === 'QUERY_TIMEOUT') {
				return await conn.query(soql);
			}
			throw e;
		}
	};

	return conn;
}

/**
 * TODO we should not be converting from 18 to 15, but the other way around.  Switch and migrate when possible.
 */
function normalizeId(id) {
	return id.substring(0, 15);
}

function normalizeInstanceName(name) {
	if (name && name.indexOf('DB') === 2 && name.length > 4) {
		return name.replace("DB", "");
	}
	return name;
}

function expandId(id) {
	if (id.length === 18) return id;
	if (id.length !== 15) throw "Illegal argument length. 15 char string expected.";

	let triplet = [id.substring(0, 5), id.substring(5, 10), id.substring(10, 15)];
	triplet = triplet.map(v => {
		let str = "";
		for (let i = v.length - 1; i >= 0; i--) {
			let code = v.charCodeAt(i);
			str += (code > 64 && code < 91) // upper alpha (A-Z)
				? "1" : "0"
		}
		return BinaryIdLookup[str];
	});
	const suffix = triplet.join("");
	return id + suffix;
}

const BinaryIdLookup = {
	"00000": 'A', "00001": 'B', "00010": 'C', "00011": 'D', "00100": 'E',
	"00101": 'F', "00110": 'G', "00111": 'H', "01000": 'I', "01001": 'J',
	"01010": 'K', "01011": 'L', "01100": 'M', "01101": 'N', "01110": 'O',
	"01111": 'P', "10000": 'Q', "10001": 'R', "10010": 'S', "10011": 'T',
	"10100": 'U', "10101": 'V', "10110": 'W', "10111": 'X', "11000": 'Y',
	"11001": 'Z', "11010": '0', "11011": '1', "11100": '2', "11101": '3',
	"11110": '4', "11111": '5'
};

exports.buildOrgConnection = buildOrgConnection;
exports.expandId = expandId;
exports.normalizeId = normalizeId;
exports.normalizeInstanceName = normalizeInstanceName;
exports.OrgTypes = OrgTypes;
exports.AccountIDs = AccountIDs;
exports.SFDC_API_VERSION = SFDC_API_VERSION;
