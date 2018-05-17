import * as h from './h';



let url = "/api/upgradeitems";

export let requestById = (id, fetchStatus) => h.get(`${url}/${id}`, {fetchStatus});
export let findByUpgrade = (upgradeId, sort, fetchStatus) => h.get(url, {upgradeId, sort_field: sort.field, sort_dir: sort.direction, fetchStatus});
export let activateItems = (items) => h.post(url + "/activate", {items});
export let cancelItems = (items) => h.post(url + "/cancel", {items});


export const Status = {Created: "Created", Pending: "Pending", InProgress: "InProgress", Canceling: "Canceling", 
    Succeeded: "Succeeded", Failed: "Failed", Canceled: "Canceled", Ineligible: "Ineligible"};
export const DoneStatus = {Succeeded: Status.Succeeded, Failed: Status.Failed, Canceled: Status.Canceled, Ineligible: Status.Ineligible};
export let isDoneStatus = (status) => typeof DoneStatus[status] !== "undefined";
