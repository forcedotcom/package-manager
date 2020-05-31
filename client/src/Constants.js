export const UPGRADE_ICON = {name: "custom92", category: "custom"};
export const UPGRADE_ITEM_ICON = {name: "custom25", category: "custom"};
export const UPGRADE_JOB_ICON = {name: "custom44", category: "custom"};
export const ORG_ICON = {name: "account", category: "standard"};
export const ORG_GROUP_ICON = {name: "groups", category: "standard"};
export const LICENSE_ICON = {name: "drafts", category: "standard"};
export const PACKAGE_ORG_ICON = {name: "process", category: "standard"};
export const PACKAGE_ICON = {name: "thanks", category: "standard"};
export const PACKAGE_VERSION_ICON = {name: "custom72", category: "custom"};
export const ADMIN_ICON = {name: "calibration", category: "standard"};
export const AUTH_ICON = {name: "portal", category: "standard"};

export const Messages = {
	READ_ONLY_USER: "You are only allowed to view information, not modify it.",
	NOTHING_TO_DO: "Nothing to do.",
	SAME_USER_ACTIVATE: "The same user that scheduled an upgrade cannot activate it",
	ACTIVATE_UPGRADE: "Activate all items for upgrade",
	ACTIVATE_UPGRADE_ITEMS: "Activate the selected items for upgrade"
};

const typeMap = {
	org: ORG_ICON,
	org_group: ORG_GROUP_ICON,
	upgrade: UPGRADE_ICON,
	upgrade_item: UPGRADE_ITEM_ICON,
	upgrade_job: UPGRADE_JOB_ICON,
	license: LICENSE_ICON,
	package_org: PACKAGE_ORG_ICON,
	package_version: PACKAGE_VERSION_ICON
};

export const iconForType = (type) => {
	return typeMap[type] || AUTH_ICON;
};

export const Status = {
	Created: "Created", Pending: "Pending", InProgress: "InProgress", 
	Succeeded: "Succeeded", Failed: "Failed", Canceled: "Canceled", Invalid: "Invalid",
	Ineligible: "Ineligible"
};

export const PackageVersionStatus = {
	Verified: "Verified", PreRelease: "Pre-Release", Preview: "Preview", Limited: "Limited",
};

export const Colors = {
	Success: "#BFD641", // Pantone Lime Punch Spring '18
	SuccessDark: "#a2b537", // Pantone Lime Punch Spring '18, just a bit darker
	Warning: "#FFD662", // Pantone Aspen Gold Summer '19
	WarningDark: "#c9a94d", // Pantone Aspen Gold Summer '19, just a bit darker
	Error: "#DD4132", // Pantone Fiesta Summer '19
	Neutral: "#6B5B95", // Pantone Ultra Violet COTY '19
	Subtle: "#77777E" // Bluey gray
};

export const getProgressFromUpgradeItem = item => {
	let count = item.eligible_job_count; // Use eligible count as progress count
	let errors = item.failed_job_count;
	let invalid = item.invalid_job_count;
	let canceled = item.canceled_job_count;
	let pending = item.pending_job_count;
	let inprogress = item.inprogress_job_count;
	let succeeded = item.succeeded_job_count;
	let active = errors + canceled + pending + inprogress + succeeded;
	let started = errors + canceled + inprogress + succeeded + invalid;
	let completed = errors + canceled + succeeded + invalid;
	let percentage = (started + completed) / (count * 2);
	let percentageReady = item.job_count / item.total_job_count;
	let percentageCanceled = canceled / count;
	let percentageError = (errors + invalid) / count;
	let percentageSuccess = percentage - (percentageCanceled + percentageError);
	let done = percentage === 1 || count === 0;
	return {
		count, succeeded, errors, canceled, active, started, completed,
		percentage, percentageReady, percentageSuccess, percentageCanceled, percentageError, done
	};
};

export const getProgress = statusRecs => {
	if (!statusRecs || statusRecs.length === 0)
		return {count: 0, active: 0, started: 0, completed: 0, succeeded: 0, errors: 0, canceled: 0, percentage: 0, done: 0};

	let count = statusRecs.length, active = 0, started = 0, completed = 0, succeeded = 0, errors = 0, invalid = 0, canceled = 0;
	for (let i = 0; i < statusRecs.length; i++) {
		let rec = statusRecs[i];
		switch (rec.status) {
			case Status.Ineligible:
				count--;
				break;
			case Status.Failed:
				active++;
				started++;
				completed++;
				errors++;
				break;
			case Status.Canceled:
				active++;
				started++;
				completed++;
				canceled++;
				break;
			case Status.Created:
				break;
			case Status.Pending:
				active++;
				break;
			case Status.InProgress:
				active++;
				started++;
				break;
			case Status.Succeeded:
				active++;
				started++;
				completed++;
				succeeded++;
				break;
			case Status.Invalid:
				invalid++;
				started++;
				completed++;
				break;
			default:
				break;
		}
	}
	const percentage = (started + completed) / (count * 2);
	const percentageCanceled = canceled / count;
	const percentageError = (errors + invalid) / count;
	const percentageSuccess = percentage - (percentageCanceled + percentageError);
	const done = percentage === 1 || count === 0;
	return {count, active, started, completed, succeeded, errors, canceled, percentage,
		percentageSuccess, percentageCanceled, percentageError, done};
};

export const GroupTypes = [
	{name: "Upgrade Group", label: "Upgrade Groups"},
	{name: "Blacklist", label: "Blacklists"},
	{name: "Whitelist", label: "Whitelists"}
];
