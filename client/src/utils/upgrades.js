/**
 * Given a list of org package versions, return
 * @param versions
 * @returns {*[]}
 */
export const resolveUpgradeablePackages = (versions) => {
	const upgradeableVersions = versions.filter(v => v.version_id !== v.latest_limited_version_id && (v.license_status === 'Active' || v.license_status === 'Trial'));
	const packageVersionMap = new Map(upgradeableVersions.map(v => [v.package_id, v]));
	const packageVersionList = Array.from(packageVersionMap.values());
	packageVersionList.sort(function (a, b) {
		return a.dependency_tier > b.dependency_tier ? 1 : -1;
	});
	return packageVersionList.map(v => v.package_id);
};
