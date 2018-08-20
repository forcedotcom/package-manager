import * as h from './h';

let url = "/api/packageversions";

export let requestAll = (sort_field, sort_dir) => h.get(url, {sort_field, sort_dir});

export let requestAllValid = (packageIds) => h.get(url, {packageIds, 
	status: ['Verified','Pre-Release','Preview','Limited'], sort_field: 'version_number', sort_dir: 'desc'});

export let findByPackage = (packageIds, sort_field, sort_dir) => h.get(url, {
	packageIds, sort_field: sort_field, sort_dir: sort_dir});

export let findByPackageOrgId = (packageOrgIds, sort_field, sort_dir) => h.get(url, {packageOrgIds, sort_field, sort_dir});

export let findByLicensedOrgId = licensedOrgIds => h.get(url, {licensedOrgIds, status: ['All']});

export let findByOrgGroupId = (orgGroupIds, sort_field, sort_dir) => h.get(url, {orgGroupIds, sort_field, sort_dir});

export let requestById = id => h.get(url + "/" + id);