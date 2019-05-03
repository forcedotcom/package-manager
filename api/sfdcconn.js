'use strict';

const jsforce = require('jsforce');
const packageorgs = require('./packageorgs');
const logger = require("../util/logger").logger;

const OrgTypes = {
	Accounts: "Accounts",
	Licenses: "Licenses",
	Package: "Package"
};

const KnownOrgs = {};

const AccountIDs = {
    Internal: '000000000000000',
    Invalid: '000000000000001'
};

const PORT = process.env.PORT || 5000;
const SFDC_API_VERSION = "45.0";

const CALLBACK_URL = (process.env.LOCAL_URL || 'http://localhost:' + PORT) + '/oauth2/callback';

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const TRACE_FUNCTIONS = ["query", "sobject", "retrieve", "insert", "update", "upsert"];

const DEFAULT_ORGS = [
	// {
	// 	type: OrgTypes.ProductionBlacktab,
	// 	instanceUrl: "https://bt1.my.salesforce.com"
	// },
	// {
	// 	type: OrgTypes.SandboxBlacktab,
	// 	instanceUrl: "https://sbt2.cs10.my.salesforce.com"
	// },
	{
		type: OrgTypes.Accounts,
		instanceUrl: "https://org62.my.salesforce.com"
	},
	{
		type: OrgTypes.Licenses,
		instanceUrl: "https://login.salesforce.com"
	}
];

async function init() {
	let orgsConfig = process.env.NAMED_ORGS ? JSON.parse(process.env.NAMED_ORGS) : [];
	logger.info(`Initializing named orgs from ${process.env.NAMED_ORGS ? process.env.NAMED_ORGS : 'nothing'}`);

	// Start with configured orgs
	orgsConfig.forEach(orgConfig => {
		KnownOrgs[orgConfig.type] = orgConfig;
	});

	// Add default orgs if not found
	DEFAULT_ORGS.forEach(defaultOrg => {
		if (!orgsConfig[defaultOrg.type]) {
			// Clone the default
			KnownOrgs[defaultOrg.type] = Object.assign({}, defaultOrg);
		}
	});

	// Overlay the package orgs last, overriding anything prior
	let orgs = await packageorgs.retrieveAll();
	orgs.forEach(org => initOrg(org.type, org.org_id, org.instance_url));
}

function initOrg(type, orgId, instanceUrl) {
	if (type == null || type === OrgTypes.Package)
		return; // Nothing to do here.

	Object.entries(OrgTypes).forEach(([key, value]) => {
		if (value === type) {
			KnownOrgs[type] = {type, orgId, instanceUrl};
			logger.info(`Updating named org type ${type} from registered org ${orgId}, ${instanceUrl}`);
		}
	});
}

async function invalidateOrgs(orgIds) {
	Object.entries(KnownOrgs).forEach(([key, orgConfig]) => {
		if (orgIds.find(id => id === orgConfig.orgId)) {
			delete KnownOrgs[key];
		}
	});

	await init();
}

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
	let orgs = await packageorgs.retrieveByOrgIds([packageOrgId]);
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

exports.buildOrgConnection = buildOrgConnection;
exports.normalizeId = normalizeId;
exports.normalizeInstanceName = normalizeInstanceName;
exports.init = init;
exports.initOrg = initOrg;
exports.invalidateOrgs = invalidateOrgs;
exports.KnownOrgs = KnownOrgs;
exports.OrgTypes = OrgTypes;
exports.AccountIDs = AccountIDs;
exports.SFDC_API_VERSION = SFDC_API_VERSION;
