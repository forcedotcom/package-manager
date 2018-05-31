'use strict';

const moment = require("moment");
const logger = require("../util/logger").logger;
const fetch = require("../worker/fetch");
const orgs = require("../api/orgs");
const orgpackageversions = require("../api/orgpackageversions");

const MAX_HISTORY = 100;

let jobQueue = [];
let jobHistory = [];
let socket = null;
let activeJobs = new Map();

class AdminJob {
    constructor(type, name, steps) {
        this.id = `${type}-${new Date().getTime()}`; // Simple id based on type and time
        this.type = type;
        this.name = name;
        this.modifiedDate = new Date();
        this.status = null;
        this.steps = Array.from(steps);
        this.stepIndex = 0;
        this.stepCount = this.collectSteps(this.steps).length;
        this.messages = [];
        this.errors = [];
        this.cancelled = false;
    }
    
    postMessage(message) {
        this.message = message;
        this.messages.push(message);
        this.modifiedDate = new Date();
        socket.emit("jobs", Array.from(activeJobs.values()));
    }
    
    postError(e) {
        this.errors.push(e);
        this.modifiedDate = new Date();
        socket.emit("jobs", Array.from(activeJobs.values()));
    }
    
    postProgress(message, stepIndex, e) {
        this.message = message;
        this.messages.push(message);
        if (e) {
            this.errors.push(e);
        }
        this.stepIndex = stepIndex;
        this.modifiedDate = new Date();
        logger.info(message, e ? {error: e.message} : {});
        socket.emit("jobs", Array.from(activeJobs.values()));
    }
    
    async run() {
        if (activeJobs.has(this.type)) {
            jobQueue.push(this);
            socket.emit("job-queue", jobQueue);
            return;
        }
        try {
            activeJobs.set(this.type, this);
            this.postMessage(`Starting job ${this.name}`);

            await this.runSteps(this.steps);
            this.status = this.cancelled ? "Cancelled" : this.errors.length > 0 ? "Failed" : "Complete";
            this.postProgress(this.cancelled ? "Admin Job Cancelled" : "Admin Job Complete", 
                this.cancelled ? this.stepIndex : this.stepCount);
            logger.info(this.cancelled ? "Admin Job Cancelled" : "Admin Job Complete", 
                {steps: this.stepCount, errors: this.errors.length})
        } catch (e) {
            this.status = "Failed";
            this.postProgress("Admin Job Failed", this.stepCount);
            logger.error("Admin Job Failed", {error: e.message || e, steps: this.stepCount, errors: this.errors.length})
        } finally {
            activeJobs.delete(this.type);
            jobHistory.push(this);
            if (jobHistory.length > MAX_HISTORY) {
                jobHistory.pop();
            }
            socket.emit("job-history", jobHistory);
            let nextJob = jobQueue.pop();
            socket.emit("job-queue", jobQueue);
            if(nextJob) {
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
            if (this.cancelled) {
                this.postProgress(`Canceling job before ${step.name.toLowerCase()}`, this.stepIndex);
                break;
            }
            this.postProgress(step.name, this.stepIndex);
            if (step.handler) {
                try {
                    await step.handler(this);
                    this.postProgress(`Completed ${step.name.toLowerCase()}`, this.stepIndex + 1);
                } catch (e) {
                    this.postProgress(`Failed ${step.name.toLowerCase()}: ${e.message || e}`, this.stepIndex + 1,
                        `${step.name.toLowerCase()}: ${e.message || e}`);
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
                    this.postProgress(`Failed ${step.name.toLowerCase()}: ${e.message || e}`, this.stepIndex);
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
        this.cancelled = true;
    }
}

function connect(sock) {
    socket = sock;
    socket.on('fetch', function () {
        fetchData().then(() => {});
    });
    socket.on('fetch-all', function () {
        fetchData(true).then(() => {});
    });
    socket.on('fetch-invalid', function () {
        fetchInvalidOrgs().then(() => {});
    });
    socket.on('cancel-jobs', function (jobIds) {
        cancelJobs(jobIds);
    });
    socket.on('refresh-versions', async function (groupId) {
        let orgIds = (await orgs.findByGroup(groupId)).map(o => o.org_id);
        await fetchVersions(orgIds);
        socket.emit("refresh-versions", groupId);
    });
}

function requestJobs(req, res) {
    res.json({jobs: Array.from(activeJobs.values()), queue: jobQueue, history: jobHistory});    
}

function requestCancel(req, res) {
    cancelJobs(req.body.jobIds);
    res.json({jobs: Array.from(activeJobs.values()), queue: jobQueue, history: jobHistory});    
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
        socket.emit("job-queue", jobQueue);
    }
}

function scheduleJobs() {
    // Define singleton fetch intervals.
    if (process.env.FETCH_INTERVAL_MINUTES != null) {
        let interval = process.env.FETCH_INTERVAL_MINUTES * 60 * 1000;
        setInterval(() => {fetchData(false, interval).then(() => logger.info("Finished scheduled fetch"))}, interval);
        logger.info(`Scheduled fetching of latest data every ${process.env.FETCH_INTERVAL_MINUTES} minutes`)
    }

    if (process.env.FETCH_INVALID_INTERVAL_HOURS != null) {
        // Always start heavyweight tasks at the end of the day.
        let interval = process.env.FETCH_INVALID_INTERVAL_HOURS * 60 * 60 * 1000;
        let delay = moment().endOf('day').toDate().getTime() - new Date().getTime();
        setTimeout(() => setInterval(() => {fetchInvalidOrgs(interval).then(() => logger.info("Finished scheduled fetch invalid orgs"))}, interval), delay);
        let startTime = moment(new Date().getTime() + delay + interval).format('lll Z');
        logger.info(`Scheduled fetching of invalid orgs starting ${startTime} and recurring every ${process.env.FETCH_INVALID_INTERVAL_HOURS} hours`)
    }

    if (process.env.REFETCH_INTERVAL_DAYS != null) {
        // Always start heavyweight at the end of the day.
        let interval = process.env.REFETCH_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
        let delay = moment().endOf('day').toDate().getTime() - new Date().getTime();
        setTimeout(() => setInterval(() => {fetchData(true, interval).then(() => logger.info("Finished scheduled fetch all"))}, interval), delay);
        let startTime = moment(new Date().getTime() + delay + interval).format('lll Z');
        logger.info(`Scheduled re-fetching of all data starting ${startTime} and recurring every ${process.env.REFETCH_INTERVAL_DAYS} days`)
    }
}

async function fetchData(fetchAll, interval) {
    const job = fetch.fetch(fetchAll);
    job.interval = interval;
    await job.run();
}

async function fetchInvalidOrgs(interval) {
    const job = fetch.fetchInvalid();
    job.interval = interval;
    await job.run();
}

async function fetchVersions(orgIds) {
    const job = orgpackageversions.fetchOrgPackageVersions(orgIds);
    await job.run();
}

exports.connect = connect;
exports.scheduleJobs = scheduleJobs;
exports.requestJobs = requestJobs;
exports.requestCancel = requestCancel;
exports.fetchVersions = fetchVersions;
exports.AdminJob = AdminJob;
