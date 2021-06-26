const db = require('../util/pghelper');
const orgs = require('./orgs');
const admin = require('./admin');
const sfdc = require('./sfdcconn');
const push = require('../worker/packagepush');
const logger = require('../util/logger').logger;

const DEFAULT_BLACKLIST = process.env.DENIED_ORGS;
const EXPAND_BLACKLIST = process.env.EXPAND_BLACKLIST === "true";
const DEFAULT_WHITELIST = process.env.ALLOWED_ORGS;
const EXPAND_WHITELIST = process.env.EXPAND_WHITELIST === "true";

const SELECT_ALL = "SELECT id, name, type, description, created_date FROM org_group";

const QUERY_DICTIONARY = {get: s => s};

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
	const filters = req.query.filters ? JSON.parse(req.query.filters) : null;
	if (filters && filters.length > 0) {
		whereParts.push(...filter.parseSQLExpressions(QUERY_DICTIONARY, filters));
	}

	let where = whereParts.length > 0 ? (" WHERE " + whereParts.join(" AND ")) : "";
	let sort = ` ORDER BY ${req.query.sort_field || "name"} ${req.query.sort_dir || "asc"}`;

	try {
		let recs = await db.query(SELECT_ALL + where + sort + limit, values);
		return res.json(recs);
	} catch (e) {
		next(e);
	}
}

async function requestById(req, res, next) {
	let where = " WHERE id = $1";

	try {
		let rows = await db.query(SELECT_ALL + where, [req.params.id]);
		return res.json(rows[0]);
	} catch (e) {
		next(e);
	}
}

async function requestMembers(req, res, next) {
	try {
		let recs = await orgs.findByGroup(req.params.id);
		return res.json(recs);
	} catch (e) {
		next(e);
	}
}

async function requestAddMembers(req, res, next) {
	try {
		const orggroup = await insertOrgMembers(req.params.id, req.body.name, req.body.orgIds);
		return res.json(orggroup);
	} catch (e) {
		next(e);
	}
}

async function requestRemoveMembers(req, res, next) {
	try {
		const groupId = req.params.id;
		await deleteOrgMembers(groupId, req.body.orgIds);
		admin.emit(admin.Events.GROUP_MEMBERS, groupId);
		admin.emit(admin.Events.GROUP_VERSIONS, groupId);
	} catch (e) {
		next(e);
	}
}

async function requestCreate(req, res, next) {
	try {
		const og = req.body;
		let i = 0;
		const rows = await db.insert(`INSERT INTO org_group (name, type, description, created_date) VALUES ($${++i}, $${++i}, $${++i}, NOW())`, [og.name, og.type || GroupType.UpgradeGroup, og.description || '']);
		const groupId = rows[0].id;
		await insertOrgMembers(groupId, og.name, og.orgIds);
		return res.json(rows[0]);
	} catch (e) {
		next(e);
	}
}

async function requestUpdate(req, res, next) {
	try {
		const og = req.body;
		const groupId = og.id;
		let i = 0;
		const updatedGroup = await db.update(`UPDATE org_group SET name=$${++i}, type=$${++i}, description=$${++i} WHERE id=$${++i}`, [og.name, og.type, og.description, og.id]);
		await insertOrgMembers(og.id, og.name, og.orgIds);
		admin.emit(admin.Events.GROUP, groupId);
		return res.send(updatedGroup[0]);
	} catch (e) {
		next(e);
	}
}

async function requestDelete(req, res, next) {
	try {
		let ids = req.body.orggroupIds;
		let n = 1;
		let params = ids.map(() => `$${n++}`);
		await db.delete(`DELETE FROM org_group_member WHERE org_group_id IN (${params.join(",")})`, ids);
		await db.delete(`DELETE FROM org_group WHERE id IN (${params.join(",")})`, ids);
		admin.emit(admin.Events.GROUPS);
		return res.send({result: 'ok'});
	} catch (e) {
		next(e);
	}
}

function requestUpgrade(req, res, next) {
	push.upgradeOrgGroup(req.params.id, req.body.versions, req.body.scheduled_date, req.session.username, req.body.gus_reference, req.body.description, req.body.transid)
		.then((upgrade) => {
			admin.emit(admin.Events.UPGRADE, upgrade);
		})
		.catch((e) => {
			logger.error("Failed to upgrade org group", {org_group_id: req.params.id, error: e.message || e});
			next(e);
		});
	
	return res.json({result: "OK"});
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
	let missingOrgs = [];
	if (orgIds && orgIds.length > 0) {
		let l = 1;
		let orgIdParams = orgIds.map(() => `($${l++})`);
		missingOrgs = await db.query(`
        SELECT t.org_id
        FROM (VALUES ${orgIdParams.join(",")}) AS t (org_id) 
        LEFT JOIN org ON t.org_id = org.org_id
        WHERE org.org_id IS NULL`, orgIds);

		let n = 2;
		let params = orgIds.map(() => `($1,$${n++})`);
		let values = [orggroup.id].concat(orgIds);
		let sql = `INSERT INTO org_group_member (org_group_id, org_id) VALUES ${params.join(",")}
               on conflict do nothing`;
		await db.insert(sql, values);
		logger.info("Added orgs to group", {group_id: orggroup.id, org_ids: orgIds.join(',')});
	}
	if (missingOrgs.length > 0) {
		// If we need to create net new orgs, do so asynchronously and defer the group-members event
		orgs.addOrgsByIds(missingOrgs.map(o => o.org_id)).then(() => {
			admin.emit(admin.Events.ORGS);
			admin.emit(admin.Events.GROUP_MEMBERS, orggroup.id);
			admin.emit(admin.Events.GROUP_VERSIONS, orggroup.id);
		}).catch(e => admin.emit(admin.Events.FAIL, {subject: "Failed to import orgs", message: e.message || e}));
	} else {
		// No new orgs, so just fire the group-members event immediately
		admin.emit(admin.Events.GROUP_MEMBERS, orggroup.id);
	}
	return orggroup;
}

async function deleteOrgMembers(groupId, orgIds) {
	let n = 2;
	let params = orgIds.map(() => `$${n++}`);
	let values = [groupId].concat(orgIds);
	let sql = `DELETE FROM org_group_member WHERE org_group_id = $1 AND org_id IN (${params.join(",")})`;
	let res = await db.delete(sql, values);
	logger.info("Removed orgs from group", {group_id: groupId, org_ids: orgIds.join(',')});
	return res;
}

async function loadBlacklist() {
	return await loadOrgsOfType(GroupType.Blacklist, DEFAULT_BLACKLIST, EXPAND_BLACKLIST)
}

async function loadWhitelist() {
	return await loadOrgsOfType(GroupType.Whitelist, DEFAULT_WHITELIST, EXPAND_WHITELIST)
}

async function isBlacklisted(orgId) {
	return await isOrgOfType(orgId, GroupType.Blacklist, DEFAULT_BLACKLIST, EXPAND_BLACKLIST)
}

async function isWhitelisted(orgId) {
	return await isOrgOfType(orgId, GroupType.Whitelist, DEFAULT_WHITELIST, EXPAND_WHITELIST)
}

async function loadOrgsOfType(type, defaultsJSON, expandByAccount) {
	const defaults = defaultsJSON ? JSON.parse(defaultsJSON).map(id => sfdc.normalizeId(id)) : [];
	const l = expandByAccount ?
		await db.query(`
			SELECT m.org_id FROM org_group_member m
			 INNER JOIN org_group g ON g.id = m.org_group_id AND g.type = $1 
			UNION DISTINCT 
			SELECT org_id FROM org WHERE account_id IN (
				SELECT DISTINCT o.account_id FROM org o
				INNER JOIN org_group_member m ON m.org_id = o.org_id AND o.account_id != $2
				INNER JOIN org_group g ON g.id = m.org_group_id AND g.type = $1
			)`, [type, sfdc.AccountIDs.Internal]) :
		await db.query(`SELECT m.org_id FROM org_group_member m
			INNER JOIN org_group g ON g.id = m.org_group_id AND g.type = $1`, [type]);
	return new Set(l.map(r => r.org_id).concat(defaults));
}

async function isOrgOfType(orgId, type, defaultsJSON, expandByAccount) {
	const defaults = new Set(defaultsJSON ? JSON.parse(defaultsJSON).map(id => sfdc.normalizeId(id)) : []);
	if (defaults.has(orgId)) {
		return true;
	}
	
	const l = expandByAccount ?
		await db.query(`SELECT m.org_id FROM org_group_member m
			INNER JOIN org_group g ON g.id = m.org_group_id AND g.type = $1
			WHERE m.org_id = $2
		UNION 
			SELECT org_id FROM org WHERE org_id = $2 AND account_id IN (
				SELECT DISTINCT o.account_id FROM org o
				INNER JOIN org_group_member m ON m.org_id = o.org_id AND o.account_id != $3
				INNER JOIN org_group g ON g.id = m.org_group_id AND g.type = $1
			)`, [type, orgId, sfdc.AccountIDs.Internal]) :
		await db.query(`SELECT m.org_id FROM org_group_member m
			INNER JOIN org_group g ON g.id = m.org_group_id AND g.type = $1
			WHERE m.org_id = $2`, [type, orgId]);
	return l.length > 0;
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
exports.isBlacklisted = isBlacklisted;
exports.isWhitelisted = isWhitelisted;
exports.GroupType = GroupType;
exports.EXPAND_BLACKLIST = EXPAND_BLACKLIST;
exports.EXPAND_WHITELIST = EXPAND_WHITELIST;
