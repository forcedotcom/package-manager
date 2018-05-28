import * as h from './h';

let url = "/api/admin";

export let requestJobs = () => h.get(url + "/jobs");
export let requestCancel = (jobIds) => h.post(url + "/jobs/cancel", {jobIds});
