const db = require('../util/pghelper');
const push = require('../worker/packagepush');

async function fetch(orgId) {
	try {
		let pushReqs = await push.findRequestsByStatus(orgId, ["Pending", "InProgress"]);
		let pushJobs = await push.findJobsByStatus(item.package_org_id, pushReqs.map(v => v.Id), ["Pending", "InProgress"]);

		let statusMap = {};
		let errorIds = [];
		for (let i = 0; i < pushJobs.length; i++) {
			let job = pushJobs[i];
			let shortId = job.Id.substring(0, 15);
			statusMap[shortId] = job.Status;
			if (job.Status === 'Failed') {
				errorIds.push(shortId);
			}
		}

		let errorMap = {};
		let pushErrors = errorIds.length > 0 ? await push.findErrorsByJobIds(item.package_org_id, errorIds) : [];
		for (let i = 0; i < pushErrors.length; i++) {
			let err = pushErrors[i];
			let shortId = err.PackagePushJobId.substring(0, 15);
			errorMap[shortId] = {
				title: err.ErrorTitle, severity: err.ErrorSeverity, type: err.ErrorType,
				message: err.ErrorMessage, details: err.ErrorDetails, job_id: shortId
			};
		}
		return res.json({item: item, status: statusMap, errors: errorMap});
	} catch (err) {
		next(err);
	}
}

exports.requestJobStatusByItem = requestJobStatusByItem;
