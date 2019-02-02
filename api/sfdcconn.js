'use strict';

const jsforce = require('jsforce');
const packageorgs = require('./packageorgs');
const logger = require("../util/logger").logger;

const OrgTypes = {
	AllProductionOrgs: "All Production Orgs",
	AllSandboxOrgs: "All Sandbox Orgs",
	Accounts: "Accounts",
	Licenses: "Licenses"
};

const KnownOrgs = {};

const PORT = process.env.PORT || 5000;
const SFDC_API_VERSION = "44.0";

const CALLBACK_URL = (process.env.LOCAL_URL || 'http://localhost:' + PORT) + '/oauth2/callback';

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const INTERNAL_ID = '000000000000000';
const INVALID_ID = '000000000000001';

const TRACE_FUNCTIONS = ["query", "sobject", "retrieve", "insert", "update", "upsert"];

const DEFAULT_ORGS = {
	bt: {
		type: OrgTypes.AllProductionOrgs,
		instanceUrl: "https://bt1.my.salesforce.com"
	},
	sbt: {
		type: OrgTypes.AllSandboxOrgs,
		instanceUrl: "https://sbt2.cs10.my.salesforce.com"
	},
	org62: {
		type: OrgTypes.Accounts,
		instanceUrl: "https://org62.my.salesforce.com"
	},
	lma: {
		type: OrgTypes.Licenses,
		instanceUrl: "https://login.salesforce.com"
	}
};

async function init() {
	let orgsConfig = process.env.NAMED_ORGS ? JSON.parse(process.env.NAMED_ORGS) : {};
	// Loop through default orgs, setting the given configured org if found, otherwise using the default
	Object.entries(DEFAULT_ORGS).forEach(([key, defaultOrg]) => {
		KnownOrgs[key] = orgsConfig[key] || defaultOrg;
	});

	let orgs = await packageorgs.retrieveAll();
	orgs.forEach(org => initOrg(org.type, org.org_id, org.instance_url));
}

function initOrg(type, orgId, instanceUrl) {
	Object.entries(KnownOrgs).forEach(([key, orgConfig]) => {
		if (orgConfig.type === type) {
			orgConfig.orgId = orgId;
			orgConfig.instanceUrl = instanceUrl;
		}
	});
}

function buildConnection(accessToken, refreshToken, instanceUrl) {
	const target = new jsforce.Connection({
			oauth2: {
				clientId: CLIENT_ID,
				clientSecret: CLIENT_SECRET,
				redirectUri: CALLBACK_URL
			},
			version: SFDC_API_VERSION,
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

async function buildOrgConnection(packageOrgId) {
	let packageOrg = await packageorgs.retrieveByOrgId(packageOrgId);
	if (!packageOrg) {
		throw `No such package org with id ${packageOrgId}`;
	}
	// if (!packageOrg.refresh_token) {
	// 	throw `Package Org ${packageOrgId} cannot be refreshed without a prior connection.`;
	// }
	let conn = buildConnection(packageOrg.access_token, packageOrg.refresh_token, packageOrg.instance_url);
	conn.on("refresh", async (accessToken, res) => {
		packageOrg.accessToken = accessToken;
		await packageorgs.updateAccessToken(packageOrgId, accessToken);
	});
	return conn;
}

exports.buildOrgConnection = buildOrgConnection;
exports.init = init;
exports.initOrg = initOrg;
exports.INTERNAL_ID = INTERNAL_ID;
exports.INVALID_ID = INVALID_ID;
exports.KnownOrgs = KnownOrgs;
