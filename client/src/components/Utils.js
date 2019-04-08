import React from 'react';
import {Colors} from "../Constants";

export const renderVersionNumber = row => {
	if (!row.latest_version_number) 
		return row.version_number;
	
	if (row.version_sort === row.latest_limited_version_sort)
		return row.version_number;

	if (row.version_sort >= row.latest_version_sort)
		return row.version_number;

	const fontColor = "white";
	const bgColor = row.license_status === 'Active' || row.license_status === 'Trial' ? Colors.SuccessDark : Colors.Subtle;
	const title = row.license_status === 'Active' || row.license_status === 'Trial' ?
		`An upgrade to ${row.package_name} ${row.latest_version_number} is available for this org` :
		`An upgrade to ${row.package_name} ${row.latest_version_number} is available for this org, but it's license is ${row.license_status.toLowerCase()} and cannot be upgraded`;
	return <span title={title}
				 style={{color: fontColor, backgroundColor: bgColor, borderRadius: "4px", margin: 0, fontWeight: "bold", padding: "2px 4px 2px 4px"}}>{row.version_number} {'\u279a'} {row.latest_version_number}</span>;
};