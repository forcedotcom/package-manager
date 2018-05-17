export const UPGRADE_ICON = { name: "custom92", category: "custom"};
export const UPGRADE_ITEM_ICON = { name: "custom25", category: "custom"};
export const UPGRADE_JOB_ICON = { name: "custom44", category: "custom"};
export const ORG_ICON = { name: "account", category: "standard"};
export const ORG_GROUP_ICON = { name: "groups", category: "standard"};
export const PACKAGE_ORG_ICON = { name: "process", category: "standard"};
export const LICENSE_ICON = { name: "drafts", category: "standard"};
export const PACKAGE_ICON = { name: "thanks", category: "standard"};
export const PACKAGE_VERSION_ICON = { name: "custom72", category: "custom"};
export const ADMIN_ICON = { name: "calibration", category: "standard"};
export const AUTH_ICON = { name: "people", category: "standard"};

export const Status = {Created: "Created", Pending: "Pending", InProgress: "InProgress", Canceling: "Canceling",
    Succeeded: "Succeeded", Failed: "Failed", Canceled: "Canceled", Ineligible: "Ineligible"};
export const DoneStatus = {Succeeded: Status.Succeeded, Failed: Status.Failed, Canceled: Status.Canceled, Ineligible: Status.Ineligible};
export let isDoneStatus = (status) => typeof DoneStatus[status] !== "undefined";
