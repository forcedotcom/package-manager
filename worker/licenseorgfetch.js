const moment = require("moment");
const db = require('../util/pghelper');
const logger = require('../util/logger').logger;

const SELECT_ALL = `SELECT DISTINCT org_id, instance, is_sandbox, modified_date FROM license 
                    WHERE status in ('Trial','Active') 
                    AND (expiration IS NULL OR expiration > DATE 'tomorrow')`;

let adminJob;

async function fetch(fetchAll, job) {
	adminJob = job;

	let fromDate = null;
	if (!fetchAll) {
		let latest = await db.query(`select max(modified_date) from org`);
		if (latest.length > 0) {
			fromDate = latest[0].max;
		}
	}
	let recs = await query(fromDate);
	return upsert(recs, 2000);
}

async function query(fromDate) {
	let select = SELECT_ALL, values = [];
	if (fromDate) {
		values.push(fromDate);
		select += ` AND modified_date > $${values.length}`;
	}
	select += ` order by modified_date asc`;
	return await db.query(select, values);
}

async function upsert(recs, batchSize) {
	if (recs.length === 0) {
		logger.info("No new license orgs found");
		return;
	}

	let msgs = [];
	let orgs = new Map();
	for (let i = 0; i < recs.length; i++) {
		let rec = recs[i];
		let old = orgs.get(rec.org_id);
		if (old && old.instance !== rec.instance) {
			msgs.push(`Org ${old.org_id} was in ${old.instance} modified ${moment(old.modified_date).format("lll")}. Updating with ${rec.instance} modified ${moment(rec.modified_date).format("lll")}`);
		}
		orgs.set(rec.org_id, rec);
	}
	recs = Array.from(orgs.values());
	let count = recs.length;
	if (msgs.length > 0) {
		logger.info('===== CONFLICTING LICENSE ORGS FOUND =====');
		logger.info("    " + msgs.join("\n    "));
	}
	logger.info(`New license orgs found`, {count});
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Upserting license orgs`, {batch: start, count: count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

async function upsertBatch(recs) {
	let values = [];
	let sql = "INSERT INTO org (org_id, instance, is_sandbox, type, modified_date) VALUES";
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.org_id, rec.instance, rec.is_sandbox, rec.is_sandbox ? "Sandbox" : "Production", rec.modified_date);
	}
	sql += ` on conflict (org_id) do update set modified_date = excluded.modified_date, instance = excluded.instance`;
	await db.insert(sql, values);
}

exports.fetch = fetch;