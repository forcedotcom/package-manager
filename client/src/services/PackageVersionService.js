import * as h from './h';

let url = "/api/packageversions";

export let requestAll = sort => h.get(url, {	
	sort_field: sort.field,
	sort_dir: sort.direction
});

export let requestAllValid = (packageIds) => h.get(url, {
	packageIds, 
	status: ['Verified','Pre-Release','Preview','Limited'],
	sort_field: 'version_number',
	sort_dir: 'desc'
});

export let findByPackage = (packageIds, sort) => h.get(url, {
	packageIds,
	sort_field: sort.field,
	sort_dir: sort.direction
});

export let findByPackageOrgId = (packageOrgIds, sort) => h.get(url, {
	packageOrgIds,
	sort_field: sort.field,
	sort_dir: sort.direction
});

export let findByLicensedOrgId = licensedOrgIds => h.get(url, {
	licensedOrgIds, 
	status: ['All']
});

export let findByOrgGroupId = (orgGroupIds, sort) => h.get(url, {
	orgGroupIds,
	sort_field: sort.field,
	sort_dir: sort.direction
});

export let requestById = id => h.get(url + "/" + id);