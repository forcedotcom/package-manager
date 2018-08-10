const db = require('../util/pghelper');
const orgs = require('./orgs');
const admin = require('./admin');
const push = require('../worker/packagepush');
const logger = require('../util/logger').logger;

const SELECT_ALL = "SELECT id, name, type, description, created_date FROM org_group";

const GroupType = {
	UpgradeGroup: "Upgrade Group",
	Blacklist: "Blacklist",
	Whitelist: "Whitelist",
	Inactive: "Inactive"
};

async function requestAll(req, res, next) {
	let whereParts = [],
		values = [],
		limit = "";

	let text = req.query.text;
	if (text) {
		values.push(`%${text}%`);
		whereParts.push(`(name LIKE $${values.length} OR description LIKE $${values.length})`);
		limit = " LIMIT 7"
	}

	if (req.query.excludeId) {
		values.push(req.query.excludeId);
		whereParts.push(`id != $${values.length}`)
	}

	if (req.query.type && req.query.type !== "All") {
		values.push(req.query.type);
		whereParts.push(`type = $${values.length}`)
	}

	let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
	let sort = ` ORDER BY ${req.query.sort_field || "name"} ${req.query.sort_dir || "asc"}`;

	try {
		let recs = await db.query(SELECT_ALL + where + sort + limit, values);
		return res.json(recs);
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

async function requestById(req, res, next) {
	let where = " WHERE id = $1";

	try {
		let rows = await db.query(SELECT_ALL + where, [req.params.id]);
		return res.json(rows[0]);
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

async function requestMembers(req, res, next) {
	try {
		let recs = await orgs.findByGroup(req.params.id);
		return res.json(recs);
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

async function requestAddMembers(req, res, next) {
	try {
		let results = await insertOrgMembers(req.params.id, req.body.name, req.body.orgIds);
		return res.json(results);
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

async function requestRemoveMembers(req, res, next) {
	try {
		await deleteOrgMembers(req.params.id, req.body.orgIds);
		return requestMembers(req, res, next);
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

async function requestCreate(req, res, next) {
	try {
		let og = req.body;
		let i = 0;
		let rows = await db.insert(`INSERT INTO org_group (name, type, description, created_date) VALUES ($${++i}, $${++i}, $${++i}, NOW())`, [og.name, og.type || GroupType.UpgradeGroup, og.description || '']);
		if (og.orgIds && og.orgIds.length > 0) {
			await insertOrgMembers(rows[0].id, rows[0].name, og.orgIds);
		}
		return res.json(rows[0]);
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

async function requestUpdate(req, res, next) {
	try {
		let og = req.body;
		let i = 0;
		await db.update(`UPDATE org_group SET name=$${++i}, type=$${++i}, description=$${++i} WHERE id=$${++i}`, [og.name, og.type, og.description, og.id]);

		if (og.orgIds && og.orgIds.length > 0) {
			insertOrgMembers(og.id, og.name, og.orgIds)
			.then(() => {
				admin.emit(admin.Events.GROUP, og.id);
			})
			.catch(e => {
				admin.emit(admin.Events.FAIL, {subject: "Org Import Failed", message: e.message});
			});
		} else {
			// No members, so emit right away.
			admin.emit(admin.Events.GROUP, og.id);
		}
		return res.send({result: 'ok'});
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

async function requestDelete(req, res, next) {
	try {
		let ids = req.body.orggroupIds;
		let n = 1;
		let params = ids.map(() => `$${n++}`);
		await db.delete(`DELETE FROM org_group_member WHERE org_group_id IN (${params.join(",")})`, ids);
		await db.delete(`DELETE FROM org_group WHERE id IN (${params.join(",")})`, ids);
		return res.send({result: 'ok'});
	} catch (e) {
		return res.status(500).send(e.message || e);
	}
}

function requestUpgrade(req, res, next) {
	push.upgradeOrgGroups([req.params.id], req.body.versions, req.body.scheduled_date, req.session.username, req.body.description)
		.then((result) => {
			return res.json(result)
		})
		.catch((e) => {
			logger.error("Failed to upgrade org group", {org_group_id: req.params.id, error: e.message || e});
			return res.status(500).send(e.message || e);
		});
}

async function insertOrgMembers(groupId, groupName, orgIds) {
	let orggroup;
	if (groupId === "-1" && groupName && groupName !== "") {
		// First, create our new group.
		let n = 0;
		orggroup = (await db.insert(`INSERT INTO org_group (name, type, description) VALUES ($${++n},$${++n},$${++n})`, [groupName, GroupType.UpgradeGroup, '']))[0];
	} else {
		orggroup = (await db.query(SELECT_ALL + " WHERE id = $1", [groupId]))[0];
	}
	let l = 1;
	let orgIdParams = orgIds.map(() => `($${l++})`);
	let missingOrgs = await db.query(`
        SELECT t.org_id
        FROM (VALUES ${orgIdParams.join(",")}) AS t (org_id) 
        LEFT JOIN org ON t.org_id = org.org_id
        WHERE org.org_id IS NULL`, orgIds);
	
	let message = null;
	if (missingOrgs.length > 0) {
		message = `${missingOrgs.length} org(s) were not found. We'll search for them and add them if possible. <p>(${missingOrgs.map(o => o.org_id).join(", ")})</p>`;
		orgs.addOrgsByIds(missingOrgs.map(o => o.org_id)).then(() => {}).catch(e => admin.emit(admin.Events.FAIL, e));
	}

	let n = 2;
	let params = orgIds.map(() => `($1,$${n++})`);
	let values = [orggroup.id].concat(orgIds);
	let sql = `INSERT INTO org_group_member (org_group_id, org_id) VALUES ${params.join(",")}
               on conflict do nothing`;
	await db.insert(sql, values);
	return {message, ...orggroup};
}

async function deleteOrgMembers(groupId, orgIds) {
	let n = 2;
	let params = orgIds.map(() => `$${n++}`);
	let values = [groupId].concat(orgIds);
	let sql = `DELETE FROM org_group_member WHERE org_group_id = $1 AND org_id IN (${params.join(",")})`;
	return await db.delete(sql, values);
}


async function loadBlacklist() {
	return await loadOrgsOfType(GroupType.Blacklist, process.env.DENIED_ORGS)
}

async function loadWhitelist() {
	return await loadOrgsOfType(GroupType.Whitelist, process.env.ALLOWED_ORGS)
}

async function loadOrgsOfType(type, defaultsJSON) {
	const defaults = defaultsJSON ? JSON.parse(defaultsJSON).map(id => id.substring(0,15)) : [];
	const sql = `
		SELECT m.org_id FROM org_group_member m
		INNER JOIN org_group AS g ON g.id = m.org_group_id
		WHERE g.type = $1`;
	const l = await db.query(sql, [type]);
	return new Set(l.map(r => r.org_id).concat(defaults));
}

exports.requestAll = requestAll;
exports.requestById = requestById;
exports.requestMembers = requestMembers;
exports.requestAddMembers = requestAddMembers;
exports.requestRemoveMembers = requestRemoveMembers;
exports.requestCreate = requestCreate;
exports.requestUpdate = requestUpdate;
exports.requestDelete = requestDelete;
exports.requestUpgrade = requestUpgrade;
exports.loadBlacklist = loadBlacklist;
exports.loadWhitelist = loadWhitelist;
