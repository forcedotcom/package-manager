'use strict';

const moment = require("moment");
const https = require("https");
const url = require('url');
const sqlinit = require('../init/sqlinit');
const logger = require("../util/logger").logger;
const fetch = require("../worker/fetch");
const packageorgs = require("./packageorgs");
const upgrades = require("./upgrades");
const sfdc = require("./sfdcconn");
const db = require("../util/pghelper");

const MAX_HISTORY = 200;

const SUMO_URL = process.env.SUMO_URL;

const Events = {
	ALERT: "alert",
	ALERT_INVALID_ORG: "alert-invalid-org",
	FAIL: "fail",
	JOBS: "jobs",
	JOB_QUEUE: "job-queue",
	JOB_HISTORY: "job-history",
	FETCH: "fetch",
	FETCH_ALL: "fetch-all",
	CANCEL_JOBS: "cancel-jobs",
	UPLOAD_ORGS: "upload-orgs",
	GROUP: "group",
	GROUPS: "groups",
	ORG_VERSIONS: "org-versions",
	REFRESH_ORG_VERSIONS: "refresh-org-versions",
	GROUP_VERSIONS: "group-versions",
	GROUP_MEMBERS: "group-members",
	REFRESH_GROUP_VERSIONS: "refresh-group-versions",
	UPGRADES: "upgrades",
	UPGRADE: "upgrade",
	UPGRADE_ITEMS: "upgrade-items",
	UPGRADE_JOBS: "upgrade-jobs",
	UPGRADE_BLACKLIST: "upgrade-blacklist",
	ORGS: "orgs",
	PACKAGE_ORGS: "package-orgs"
};

const JobTypes = {
	MONITOR_ORGS: "monitor-orgs",
	UPLOAD_ORGS: "upload-orgs",
	UPGRADE: "upgrade",
	FETCH: "fetch",
	REFRESH_VERSIONS: "refresh-versions"
};

let jobQueue = [];
let jobHistory = [];
let latestJobs = new Map();
let activeJobs = new Map();
let socket = null;

class AdminJob {
	constructor(type, name, steps) {
		this.id = `${type}-${new Date().getTime()}`; // Simple id based on type and time
		this.type = type;
		this.name = name;
		this.modifiedDate = new Date();
		this.startTime = 0;
		this.status = null;
		this.steps = Array.from(steps);
		this.stepIndex = 0;
		this.stepCount = this.collectSteps(this.steps).length;
		this.results = [];
		this.errors = [];
		this.canceled = false;
		this.singleton = false;
		this.shouldRun = () => true;
	}

	postMessage(message) {
		this.message = message;
		this.results.push({message, timestamp: Date.now(), details: []});
		this.modifiedDate = new Date();
        logger.info(`Job Update: ${message}`, {
			...this,
			modified: moment(this.modifiedDate).format('lll Z')
		});
		emit(Events.JOBS, Array.from(activeJobs.values()));
	}

	postProgress(message, stepIndex, e) {
		e = !e ? null : e.message ? e : {message: String(e)};

		this.message = message;
		this.results.push({message, timestamp: Date.now(), details: [], error: e});
		if (e) {
			this.errors.push({message: e.message, timestamp: Date.now()});
		}
		if (stepIndex > 0) {
			this.stepIndex = stepIndex;
		}
		this.modifiedDate = new Date();
		logger.info(`Job Progress: ${message}`, e ? {error: e.message} : {
			...this,
			modified: moment(this.modifiedDate).format('lll Z')
		});
		emit(Events.JOBS, Array.from(activeJobs.values()));
	}

	postDetail(detail, e) {
		e = !e ? null : e.message ? e : {message: String(e)};

		const r = this.results[this.results.length-1];
		r.timestamp = Date.now();
		r.details.push(detail);
		if (e) {
			r.error = e;
			this.errors.push({message: e.message, timestamp: Date.now()});
			logger.error(detail, e);
		}
		this.modifiedDate = new Date();
		emit(Events.JOBS, Array.from(activeJobs.values()));
	}

	async run() {
		const f = await this.shouldRun();
		if (!f) 
			return; // Just don't do it
		
		if (activeJobs.has(this.type)) {
			if (this.singleton) {
                logger.info(`Singleton job ${this.name} already in progress.`, {
					...this,
					modified: moment(this.modifiedDate).format('lll Z')
				});
            } else {
				jobQueue.push(this);
				emit(Events.JOB_QUEUE, jobQueue);
			}
			return;
		}
		try {
			activeJobs.set(this.type, this);
			this.postMessage(`Starting job ${this.name}`);
			this.startTime = Date.now();
			await this.runSteps(this.steps);
			this.status = this.canceled ? "Cancelled" : this.errors.length > 0 ? "Failed" : "Complete";
			this.postProgress(this.canceled ? "Admin Job Cancelled" : "Admin Job Complete", this.canceled ? this.stepIndex : this.stepCount);
			logger.info(this.canceled ? "Admin Job Cancelled" : "Admin Job Complete", {
				steps: this.stepCount,
				errors: this.errors.length
			});
		} catch (e) {
			this.status = "Failed";
			this.postProgress("Admin Job Failed", this.stepCount, e);
		} finally {
			activeJobs.delete(this.type);
			logger.info(`Job Update: job ${this.type} complete and removed from active duty.`, {
				...this,
				modified: moment(this.modifiedDate).format('lll Z')
			});
			latestJobs.set(this.type, this);
			jobHistory.push(this);
			if (jobHistory.length > MAX_HISTORY) {
				jobHistory.shift();
			}
			emit(Events.JOB_HISTORY, {latest: Array.from(latestJobs.values()), all: jobHistory});
			let nextJob = jobQueue.pop();
			emit(Events.JOB_QUEUE, jobQueue);
			if (nextJob) {
				await nextJob.run();
			}
		}
	}

	collectSteps(steps, allsteps) {
		allsteps = allsteps || [];
		for (let i = 0; i < steps.length; i++) {
			let step = steps[i];
			if (step.handler) {
				allsteps.push(step);
			}
			if (step.steps) {
				this.collectSteps(step.steps, allsteps);
			}
		}
		return allsteps;
	}

	async runSteps(steps) {
		for (let i = 0; i < steps.length; i++) {
			let step = steps[i];
			if (this.canceled) {
				this.postProgress(`Canceling job before ${step.name.toLowerCase()}`, this.stepIndex);
				break;
			}
			this.postProgress(step.name, this.stepIndex);
			if (step.handler) {
				try {
					await step.handler(this);
					this.postProgress(`Completed ${step.name.toLowerCase()}`, this.stepIndex + 1);
				} catch (e) {
					this.postProgress(`Failed ${step.name.toLowerCase()}`, this.stepIndex + 1, e);
					if (step.fail) {
						step.fail(e, this);
					} else {
						throw e;
					}
				}
			}
			if (step.steps) {
				try {
					await this.runSteps(step.steps);
					this.postProgress(`Completed ${step.name.toLowerCase()}`, this.stepIndex);
				} catch (e) {
					this.postProgress(`Failed ${step.name.toLowerCase()}`, this.stepIndex, e);
					if (step.fail) {
						step.fail(e, this);
					} else {
						throw e;
					}
				}
			}
		}
	}

	cancel() {
		this.canceled = true;
	}
}

function connect(sock) {
	socket = sock;

	socket.on(Events.FETCH, function () {
		fetchData().then(() => {});
	});
	socket.on(Events.FETCH_ALL, function () {
		fetchData(true).then(() => {});
	});
	socket.on(Events.CANCEL_JOBS, function (jobIds) {
		cancelJobs(jobIds);
	});
	socket.on(Events.REFRESH_ORG_VERSIONS, async function (orgId) {
		const job = fetch.fetchOrgVersions(orgId);
		await job.run();
	});
	socket.on(Events.REFRESH_GROUP_VERSIONS, async function (groupId) {
		const job = fetch.fetchOrgGroupVersions(groupId);
		await job.run();	
	});
	socket.on(Events.UPLOAD_ORGS, async function () {
		await uploadOrgsToSumo();
	});
}

function emit(key, data) {
	if (socket != null) {
		socket.emit(key, data);
	}
}

function alert(key, subject, message) {
	emit(Events.ALERT, {subject, message});
}

function requestEmit(req, res, next) {
	emit(req.params.key);
	res.json({result: "ok"});
}

function requestSettings(req, res) {
	res.json({
		HEROKU_APP_NAME: process.env.HEROKU_APP_NAME || null
	});
}

function requestJobs(req, res) {
	res.json({jobs: Array.from(activeJobs.values()), queue: jobQueue, history: {latest: Array.from(latestJobs.values()), all: jobHistory}});
}

function requestCancel(req, res) {
	cancelJobs(req.body.jobIds);
	res.json({jobs: Array.from(activeJobs.values()), queue: jobQueue, history: {latest: Array.from(latestJobs.values()), all: jobHistory}});
}

function cancelJobs(data) {
	let jobIds = new Set(data);
	Array.from(activeJobs.values()).forEach(j => {
		if (jobIds.has(j.id)) {
			j.cancel();
			jobIds.delete(j.id);
		}
	});

	if (jobIds.size > 0) {
		// Also look in queue
		jobQueue = jobQueue.filter(j => !jobIds.has(j.id));
		emit(Events.JOB_QUEUE, jobQueue);
	}
}

async function startup() {
	// Ensure our database is alive and initialized
	await sqlinit.init();

	// Ensure our sfdx connections and orgs are ready
	await sfdc.init();

	// Kick off our scheduled jobs
	scheduleJobs();
}

function scheduleJobs() {
	const schedules = JSON.parse(process.env.JOB_SCHEDULES || {});
	if (schedules.org_monitor_interval_seconds != null && schedules.org_monitor_interval_seconds !== -1) {
		let interval = schedules.org_monitor_interval_seconds * 1000;
		setInterval(() => {monitorOrgs(interval).then(() => {})}, interval);
		logger.info(`Scheduled org monitor for every ${schedules.org_monitor_interval_seconds} seconds`)
	}
	
	if (schedules.upgrade_monitor_interval_seconds != null && schedules.upgrade_monitor_interval_seconds !== -1) {
		let interval = schedules.upgrade_monitor_interval_seconds * 1000;
		setInterval(() => {monitorUpgrades(interval).then(() => {})}, interval);
		logger.info(`Scheduled upgrade monitor for every ${schedules.upgrade_monitor_interval_seconds} seconds`)
	}

	if (schedules.fetch_subscriber_interval_minutes != null && schedules.fetch_subscriber_interval_minutes !== -1) {
		let interval = schedules.fetch_subscriber_interval_minutes * 60 * 1000;
		setInterval(() => {fetchData(false, interval).then(() => {})}, interval);
		logger.info(`Scheduled fetching of latest subscribers every ${schedules.fetch_subscriber_interval_minutes } minutes`)
	}

	if (schedules.fetch_all_subscriber_interval_days != null && schedules.fetch_all_subscriber_interval_days !== -1) {
		let interval = schedules.fetch_all_subscriber_interval_days* 24 * 60 * 60 * 1000;
		setInterval(() => {fetchData(true, interval).then(() => {})}, interval);
		logger.info(`Scheduled fetching of all subscribers every ${schedules.fetch_all_subscriber_interval_days } days`)
	}

	if (schedules.upload_orgs_interval_hours != null && schedules.upload_orgs_interval_hours !== -1) {
		let interval = schedules.upload_orgs_interval_hours * 60 * 60 * 1000;
		let delay = moment().endOf('day').toDate().getTime() - new Date().getTime();
		setTimeout(() => setInterval(() => {uploadOrgsToSumo(interval).then(() => {})}, interval), delay);
		let startTime = moment(new Date().getTime() + delay + interval).format('lll Z');
		logger.info(`Scheduled org upload starting ${startTime} and recurring every ${schedules.upload_orgs_interval_hours} hours`)
	}

	if (schedules.fetch_interval_minutes != null && schedules.fetch_interval_minutes !== -1) {
		let interval = schedules.fetch_interval_minutes * 60 * 1000;
		setInterval(() => {fetchData(false, interval).then(() => {})}, interval);
		logger.info(`Scheduled fetching of latest data every ${schedules.fetch_interval_minutes} minutes`)
	}

	if (schedules.fetch_all_interval_days != null && schedules.fetch_all_interval_days !== -1) {
		// Always start heavyweight at the end of the day.
		let interval = schedules.fetch_all_interval_days * 24 * 60 * 60 * 1000;
		let delay = moment().endOf('day').toDate().getTime() - new Date().getTime();
		setTimeout(() => setInterval(() => {fetchData(true, interval).then(() => {})}, interval), delay);
		let startTime = moment(new Date().getTime() + delay + interval).format('lll Z');
		logger.info(`Scheduled fetching of all data starting ${startTime} and recurring every ${schedules.fetch_all_interval_days} days`)
	}
}

async function monitorOrgs(interval) {
	const job = packageorgs.monitorOrgs();
	job.interval = interval;
	await job.run();
}

async function monitorUpgrades(interval) {
	const job = upgrades.monitorUpgrades();
	job.interval = interval;
	await job.run();
}

async function fetchData(fetchAll, interval) {
	const job = fetch.fetchData(fetchAll);
	job.interval = interval;
	await job.run();
}

async function uploadOrgsToSumo(interval) {
	let job = new AdminJob(
		JobTypes.UPLOAD_ORGS, "Upload org data to sumologic",
		[
			{
				name: "Loading org data",
				handler: async (job) => {
					job.orgs = await loadOrgsInSumoFormat(job);
				}
			},
			{
				name: "Uploading org data",
				handler: async (job) => {
					await sendOrgsToSumo(job.orgs, job);
				}
			}
		]);
	job.interval = interval;
	await job.run();
}

async function loadOrgsInSumoFormat(job) {
	let orgs = await db.query(
		`SELECT o.org_id, a.account_name, o.type, o.edition, o.instance
        FROM org o
        INNER JOIN account a on a.account_id = o.account_id
        WHERE a.account_id NOT IN ($1, $2)`, [sfdc.AccountIDs.Internal, sfdc.AccountIDs.Invalid]);
	job.postMessage(`Loaded ${orgs.length} orgs for posting to Sumo`);
	return orgs;
}

async function sendOrgsToSumo(orgs, job) {
	return new Promise((resolve, reject) => {
		if (!SUMO_URL)
			reject(new Error("SUMO_URL is required"));
		if (orgs.length === 0)
			reject(new Error("No orgs found to upload"));

		let sumoUrl = url.parse(SUMO_URL);
		let orgCSVs = orgs.map(o => `${o.org_id},"${o.account_name}",${o.type},${o.edition},${o.instance}`);
		let postData = orgCSVs.join("\n");
		let options = {
			hostname: sumoUrl.hostname,
			port: sumoUrl.port,
			path: sumoUrl.pathname,
			method: 'POST'
		};

		let req = https.request(options, (res) => {
			resolve(res);
		});

		req.on('error', (e) => {
			reject(e);
		});

		req.write(postData);
		req.end();
		job.postMessage(`Sending ${orgs.length} orgs to Sumo`);
	});
}

exports.Events = Events;
exports.connect = connect;
exports.emit = emit;
exports.alert = alert;
exports.requestEmit = requestEmit;
exports.startup = startup;
exports.requestSettings = requestSettings;
exports.requestJobs = requestJobs;
exports.requestCancel = requestCancel;
exports.AdminJob = AdminJob;
exports.JobTypes = JobTypes;
