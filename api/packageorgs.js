const db = require('../util/pghelper');
const crypt = require('../util/crypt');
const sfdc = require('./sfdcconn');
const admin = require('./admin');
const logger = require('../util/logger').logger;

const Status = {Connected: "Connected", Unprotected: "Unprotected", Invalid: "Invalid", Missing: "Missing"};

const CRYPT_KEY = process.env.CRYPT_KEY || "supercalifragolisticexpialodocious";
const PACKAGE_ORG_IP_RANGES = JSON.parse(process.env.PACKAGE_ORG_IP_RANGES) || [];
const ENABLE_ACCESS_TOKEN_UI = process.env.ENABLE_ACCESS_TOKEN_UI === "true";
const STEELBRICK_PM_PROFILE = "SteelBrick Package Manager Admin";

const SELECT_ALL = 
	`SELECT id, name, description, division, namespace, org_id, instance_name, instance_url, type, status, refreshed_date 
	${ENABLE_ACCESS_TOKEN_UI ? ", access_token" : ""}
	FROM package_org`;

// NOT to be used in UI requests
const SELECT_ALL_WITH_REFRESH_TOKEN = 
	`SELECT id, name, description, division, namespace, org_id, instance_name, instance_url, type, status, refreshed_date, 
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
	let recs = await db.query(SELECT_ALL + sort, []);
	await crypt.passwordDecryptObjects(CRYPT_KEY, recs, ["access_token"]);

	let ids = recs.map(o => o.org_id);
	Object.entries(sfdc.NamedOrgs).forEach(([key, val]) => {
		if (ids.indexOf(val.orgId) === -1) {
			recs.push({org_id: val.orgId, status: Status.Missing, name: val.name, instance_url: val.instanceUrl})
		}
	});

	return recs;
}

async function requestById(req, res, next) {
	let id = req.params.id;
	try {
		let where = " WHERE org_id = $1";
		let recs = await db.query(SELECT_ALL + where, [id]);
		if (recs.length === 0) {
			return next(new Error(`Cannot find any record with id ${id}`));
		}
		await crypt.passwordDecryptObjects(CRYPT_KEY, recs, ["access_token", "refresh_token"]);
		return res.json(recs[0]);
	} catch (err) {
		next(err);
	}
}

async function retrieve(id) {
	let where = " WHERE id = $1";
	let recs = await db.query(SELECT_ALL_WITH_REFRESH_TOKEN + where, [id]);
	await crypt.passwordDecryptObjects(CRYPT_KEY, recs, ["access_token", "refresh_token"]);
	return recs[0];
}

async function retrieveByOrgId(org_id) {
	let where = " WHERE org_id = $1";
	let recs = await db.query(SELECT_ALL_WITH_REFRESH_TOKEN + where, [org_id]);
	await crypt.passwordDecryptObjects(CRYPT_KEY, recs, ["access_token", "refresh_token"]);
	return recs[0];
}

async function initOrg(conn, org_id) {
	let org = await refreshOrgConnection(conn, org_id);
	if (org.status === Status.Invalid) {
		return await updateOrgStatus(org_id, org.status);
	}
	try {
		let result = await applyLoginIPAccessControls(org_id);
		if (!result) {
			logger.warn(`Did not find named profile`, {orgName: org.name, orgId: org_id, profileName: STEELBRICK_PM_PROFILE});
			org.status = Status.Unprotected;
			admin.emit(admin.Events.ALERT, {subject: "Profile Not Found",
				message: `Head's up.  We did not find a profile named ${STEELBRICK_PM_PROFILE} found in org ${org_id}.  We recommend you create one, so we can apply our IP access control ranges the next time you refresh.`});
		}
	} catch (e) {
		logger.warn(`Profile not updated for org ${org.name} (${org_id}).  Error: ${e.message}`);
		admin.emit(admin.Events.ALERT, {subject: 'Profile Not Updated',
			message: `Profile not updated for org ${org.name} (${org_id}).  Error: ${e.message}`});
	}

	await crypt.passwordEncryptObjects(CRYPT_KEY, [org], ["access_token", "refresh_token"]);
	let sql = `INSERT INTO package_org 
            (org_id, name, division, namespace, instance_name, instance_url, refresh_token, access_token, status)
           VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           on conflict (org_id) do update set
            name = excluded.name, division = excluded.division, namespace = excluded.namespace, instance_name = excluded.instance_name, 
            instance_url = excluded.instance_url, refresh_token = excluded.refresh_token, access_token = excluded.access_token,
            status = excluded.status`;
	return await db.insert(sql,
		[org_id, org.name, org.division, org.namespace, org.instance_name, org.instance_url, org.refresh_token, org.access_token, org.status]);
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
	
	await crypt.passwordEncryptObjects(CRYPT_KEY, [org], ["access_token", "refresh_token"]);
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
	let conn = await sfdc.buildOrgConnection(packageOrgId);
	let metadata = {
		fullName: STEELBRICK_PM_PROFILE,
		loginIpRanges: PACKAGE_ORG_IP_RANGES
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
			return {org_id: org_id, status: Status.Invalid};
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
	await crypt.passwordEncryptObjects(CRYPT_KEY, [encrypto]);
	await db.update(`UPDATE package_org set access_token = $1, status = $2, refreshed_date = NOW() WHERE org_id = $3`,
		[encrypto.access_token, Status.Connected, org_id]);
}

async function requestDelete(req, res, next) {
	try {
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
		let orgId = req.body.packageorg.org_id;
		let type = req.body.packageorg.type;
		let description = req.body.packageorg.description;
		let orgs = await db.update(`UPDATE package_org SET description = $1, type = $2 WHERE org_id = $3`, [description, type, orgId]);
		return res.json(orgs[0]);
	} catch (err) {
		next(err);
	}
}

async function requestRefresh(req, res, next) {
	try {
		let orgs = [];
		let orgIds = req.body.orgIds;
		for (let i = 0; i < orgIds.length; i++) {
			let orgId = orgIds[i];
			let conn = await sfdc.buildOrgConnection(orgId);
			let recs = await initOrg(conn, orgId);
			orgs.push(recs[0]);
		}
		await crypt.passwordDecryptObjects(CRYPT_KEY, orgs, ['access_token', 'refresh_token']);
		admin.emit(admin.Events.PACKAGE_ORGS);
		return res.json({result: "OK"});
	} catch (err) {
		next(err);
	}
}

async function requestRevoke(req, res, next) {
	try {
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
exports.retrieveById = retrieve;
exports.retrieveByOrgId = retrieveByOrgId;
exports.initOrg = initOrg;
exports.updateOrgStatus = updateOrgStatus;
exports.updateAccessToken = updateAccessToken;
exports.monitorOrgs = monitorOrgs;
exports.Status = Status;
