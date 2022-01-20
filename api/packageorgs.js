const db = require('../util/pghelper');
const crypt = require('../util/crypt');
const sfdc = require('./sfdcconn');
const admin = require('./admin');
const auth = require("./auth");
const logger = require('../util/logger').logger;

const Status = {Connected: "Connected", Unprotected: "Unprotected", Invalid: "Invalid", Missing: "Missing"};

const PACKAGE_ORG_IP_RANGES = process.env.PACKAGE_ORG_IP_RANGES;
const PACKAGE_MANAGER_ADMIN_PROFILE = process.env.PACKAGE_MANAGER_ADMIN_PROFILE;

const SELECT_ALL =
	`SELECT id, name, active, description, division, namespace, org_id, instance_name, instance_url, type, status, refreshed_date 
	FROM package_org`;

// Not to be used outside of the server.  No UI, no API.
const SELECT_ALL_WITH_REFRESH_TOKEN =
	`SELECT id, name, active, description, division, namespace, org_id, instance_name, instance_url, type, status, refreshed_date, 
		refresh_token, access_token
	FROM package_org`;

async function requestAll(req, res, next) {
	try {
		let recs = await retrieveAll(req.query.sort_field, req.query.sort_dir);
		return res.send(JSON.stringify(recs));
	} catch (err) {
		next(err);
	}
}

async function retrieveAll(sortField, sortDir) {
	let sort = ` ORDER BY ${sortField || "name"} ${sortDir || "asc"}`;
	return await db.query(SELECT_ALL + sort, []);
}

async function retrieveByType(types) {
	const params = [];
	for (let i = 0; i < types.length; i++) {
		params.push(`$${i+1}`);
	}
	return await db.query(`${SELECT_ALL} WHERE type in (${params.join(",")})`, types);
}

async function requestById(req, res, next) {
	let id = req.params.id;
	try {
		let where = " WHERE org_id = $1";
		let recs = await db.query(SELECT_ALL + where, [id]);
		if (recs.length === 0) {
			return next(new Error(`Cannot find any record with id ${id}`));
		}
		return res.json(recs[0]);
	} catch (err) {
		next(err);
	}
}

/**
 * Returns sensitive data. Not to be used lightly outside of the server.
 */
async function secureRetrieveByOrgIds(orgIds) {
	let where = ` WHERE org_id IN (${orgIds.map((o,i) => `$${i+1}`).join(",")})`;
	let recs = await db.query(SELECT_ALL_WITH_REFRESH_TOKEN + where, orgIds);
	try {
		await crypt.decryptObjects(recs, ["access_token", "refresh_token"]);
	} catch (e) {
		admin.emit(admin.Events.ALERT, {subject: "Failed to decrypt tokens", message: `One or more connected orgs' access or refresh tokens could not be read due to an error: ${e.message || e}`});
	}
	return recs;
}

/**
 * Create or update a connected org.
 *
 * @insertUniqueType if true, do not create or update an org if already found one of the same type.
 */
async function initOrg(conn, org_id, type, insertUniqueType) {
	if (insertUniqueType) {
		if (!type) {
			throw `Cannot add unique org type without a valid type`;
		}
		const found = await db.retrieve('SELECT type FROM package_org WHERE type = $1', [type]);
		if (found) {
			return logger.error(`Org of type ${type} already found`);
		}
	}

	let org = await refreshOrgConnection(conn, org_id);
	if (org.status === Status.Invalid) {
		return await updateOrgStatus(org_id, org.status);
	}
	try {
		let result = await applyLoginIPAccessControls(org_id);
		if (!result && PACKAGE_MANAGER_ADMIN_PROFILE) {
			logger.warn(`Did not find named profile`, {orgName: org.name, orgId: org_id, profileName: PACKAGE_MANAGER_ADMIN_PROFILE});
			org.status = Status.Unprotected;
			admin.emit(admin.Events.ALERT, {subject: "Profile Not Found",
				message: `Head's up.  We did not find a profile named ${PACKAGE_MANAGER_ADMIN_PROFILE} found in org ${org_id}.  We recommend you create one, so we can apply our IP access control ranges the next time you refresh.`});
		}
	} catch (e) {
		logger.warn(`Profile not updated for org ${org.name} (${org_id}).  Error: ${e.message}`);
		admin.emit(admin.Events.ALERT, {subject: 'Profile Not Updated',
			message: `Profile not updated for org ${org.name} (${org_id}).  Error: ${e.message}`});
	}

	// Upsert the package_org record and return
	await crypt.encryptObjects([org], ["access_token", "refresh_token"]);

	// Default type to Package automatically when a namespace is found
	if (!type && org.namespace) {
		type = sfdc.OrgTypes.Package;
	}
	let n = 1;
	const params = `$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++},$${n++}`;
	let sql = `INSERT INTO package_org 
            (org_id, name, division, namespace, instance_name, instance_url, refresh_token, access_token, status, type, active)
           VALUES (${params})
           ON CONFLICT (org_id) DO UPDATE SET
            name = excluded.name, division = excluded.division, namespace = excluded.namespace, instance_name = excluded.instance_name, 
            instance_url = excluded.instance_url, refresh_token = excluded.refresh_token, access_token = excluded.access_token,
            status = excluded.status, type = excluded.type`;
	return await db.insert(sql,
		[org_id, org.name, org.division, org.namespace, org.instance_name, org.instance_url, org.refresh_token, org.access_token, org.status, type, true]);
}

async function refreshOrg(conn, org) {
	let refreshed = await refreshOrgConnection(conn, org.org_id);

	if (refreshed.status === Status.Invalid) {
		admin.emit(admin.Events.ALERT_INVALID_ORG, {subject: "Invalid connection", org,
			message: `The connection to the org ${org.name} (${org.org_id}) is invalid.  Click to re-authenticate.`})
		return await updateOrgStatus(org.org_id, Status.Invalid);
	}

	if (org.status === refreshed.status) {
		return; // Nothing to do.
	}

	// Org status changed, so update our data to match.
	org = refreshed;

	await crypt.encryptObjects([org], ["access_token", "refresh_token"]);
	let sql = `INSERT INTO package_org 
            (org_id, name, division, namespace, instance_name, instance_url, refresh_token, access_token, status)
           VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           on conflict (org_id) do update set
            name = excluded.name, division = excluded.division, namespace = excluded.namespace, instance_name = excluded.instance_name, 
            instance_url = excluded.instance_url, refresh_token = excluded.refresh_token, access_token = excluded.access_token,
            status = excluded.status`;
	return await db.insert(sql,
		[org.org_id, org.name, org.division, org.namespace, org.instance_name, org.instance_url, org.refresh_token, org.access_token, org.status]);
}

async function applyLoginIPAccessControls(packageOrgId) {
	if (!PACKAGE_MANAGER_ADMIN_PROFILE) {
		logger.warn('No PACKAGE_MANAGER_ADMIN_PROFILE name given.  Login IP Access control helper cannot help you.');
		return false;
	}

	let conn = await sfdc.buildOrgConnection(packageOrgId);
	let metadata = {
		fullName: PACKAGE_MANAGER_ADMIN_PROFILE,
		loginIpRanges: PACKAGE_ORG_IP_RANGES ? JSON.parse(PACKAGE_ORG_IP_RANGES) : []
	};

	let result = await conn.metadata.update('Profile', metadata);
	return result.success;
}

async function updateOrgStatus(orgId, status) {
	return await db.update(`UPDATE package_org SET status = $1, access_token = null WHERE org_id = $2`, [status, orgId]);
}

async function refreshOrgConnection(conn, org_id) {
	try {
		let org = await conn.sobject("Organization").retrieve(org_id);

		return {
			org_id,
			status: Status.Connected,
			instance_url: conn.instanceUrl,
			refresh_token: conn.refreshToken,
			access_token: conn.accessToken,
			name: org.Name,
			division: org.Division,
			namespace: org.NamespacePrefix,
			instance_name: org.InstanceName
		};
	} catch (error) {
		if (error.name === "invalid_grant") {
			return {org_id, status: Status.Invalid};
		}

		// No access to the Organization object.  Not ideal, but our token was still refreshed.
		return {
			org_id,
			name: parseNameFromMyUrl(conn.instanceUrl),
			status: Status.Connected,
			instance_url: conn.instanceUrl,
			refresh_token: conn.refreshToken,
			access_token: conn.accessToken
		};
	}
}

function parseNameFromMyUrl(instanceUrl) {
	let n = instanceUrl.indexOf("://");
	let m = instanceUrl.indexOf(".my.salesforce.com");
	if (n === -1 || m === -1) {
		return null; // Nope. Bad url! Bad url!
	}
	return instanceUrl.substring(n + 3, m).toUpperCase();
}

async function updateAccessToken(org_id, access_token) {
	let encrypto = {access_token: access_token};
	await crypt.encryptObjects([encrypto]);
	await db.update(`UPDATE package_org set access_token = $1, status = $2, refreshed_date = NOW() WHERE org_id = $3`,
		[encrypto.access_token, Status.Connected, org_id]);
}

async function requestActivation(req, res, next) {
	let orgIds = req.body.orgIds;
	let flag = req.body.flag;
	try {
		auth.checkReadOnly(req.session.user);

		let params = orgIds.map((o,i) => `$${i+2}`);
		let values = [flag];
		values.push(...orgIds);
		await db.update(`UPDATE package_org SET active = $1 WHERE org_id IN (${params.join(",")})`, values);
	} catch (err) {
		next(err);
	}

	if (flag) {
		return await requestRefresh(req, res, next);
	} else {
		admin.emit(admin.Events.PACKAGE_ORGS);
		return res.send({result: 'OK'});
	}
}

async function requestDelete(req, res, next) {
	try {
		auth.checkReadOnly(req.session.user);

		let orgIds = req.body.orgIds;
		await revokeByOrgIds(orgIds);

		let n = 1;
		let params = orgIds.map(() => `$${n++}`);
		await db.delete(`DELETE FROM package_org WHERE org_id IN (${params.join(",")})`, orgIds);
		admin.emit(admin.Events.PACKAGE_ORGS);
		return res.send({result: 'OK'});
	} catch (err) {
		next(err);
	}
}

async function requestUpdate(req, res, next) {
	try {
		auth.checkReadOnly(req.session.user);

		let orgId = req.body.packageorg.org_id;
		let type = req.body.packageorg.type;
		let description = req.body.packageorg.description;
		let orgs = await db.update(`UPDATE package_org SET description = $1, type = $2 WHERE org_id = $3`, [description, type, orgId]);
		admin.emit(admin.Events.PACKAGE_ORGS);return res.json(orgs[0]);
	} catch (err) {
		next(err);
	}
}

async function requestRefresh(req, res, next) {
	try {
		auth.checkReadOnly(req.session.user);

		await refreshByOrgIds(req.body.orgIds);
		admin.emit(admin.Events.PACKAGE_ORGS);
		res.json({result: "OK"});
	} catch (e) {
		next(e);
	}
}

async function refreshByOrgIds(orgIds) {
	let orgs = await secureRetrieveByOrgIds(orgIds);
	for (let i = 0; i < orgs.length; i++) {
		let org = orgs[i];
		let conn = await sfdc.buildOrgConnection(org.org_id);
		await initOrg(conn, org.org_id, org.type);
	}
}

async function requestRevoke(req, res, next) {
	try {
		auth.checkReadOnly(req.session.user);

		let orgIds = req.body.orgIds;
		await revokeByOrgIds(orgIds);
		admin.emit(admin.Events.PACKAGE_ORGS);
		res.json({result: "OK"});
	} catch (err) {
		next(err);
	}
}

async function revokeByOrgIds(orgIds) {
	for (let i = 0; i < orgIds.length; i++) {
		let orgId = orgIds[i];
		let conn = await sfdc.buildOrgConnection(orgId);
		try {
			await conn.logoutByOAuth2(conn.refreshToken != null);
		} catch (e) {
			// Connection is already invalid, just be sure our local record is updated.
		}

		await db.update(
			`UPDATE package_org SET status = $1, access_token = null, refresh_token = null 
				WHERE org_id = $2`, [Status.Invalid, orgId]);
	}
}

async function monitorConnectedOrgs(job) {
	const orgs = await retrieveAll();
	for (let i = 0; i < orgs.length; i++) {
		const org = orgs[i];
		const conn = await sfdc.buildOrgConnection(org.org_id);
		await refreshOrg(conn, org);
	}
}

function monitorOrgs() {
	const job = new admin.AdminJob(
		admin.JobTypes.MONITOR_ORGS, "Monitor connected orgs",
		[
			{
				name: "Monitor connected orgs",
				handler: job => monitorConnectedOrgs(job)
			}
		]);
	job.singleton = true; // Don't queue us up
	return job;
}

exports.requestAll = requestAll;
exports.requestById = requestById;
exports.requestUpdate = requestUpdate;
exports.requestRefresh = requestRefresh;
exports.requestRevoke = requestRevoke;
exports.requestDelete = requestDelete;
exports.requestActivation = requestActivation;
exports.retrieveAll = retrieveAll;
exports.retrieveByType = retrieveByType;
exports.secureRetrieveByOrgIds = secureRetrieveByOrgIds;
exports.initOrg = initOrg;
exports.updateOrgStatus = updateOrgStatus;
exports.updateAccessToken = updateAccessToken;
exports.monitorOrgs = monitorOrgs;
exports.Status = Status;
