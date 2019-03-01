import React from 'react';

export const renderVersionNumber = row => {
	if (!row.latest_version_number) 
		return row.version_number;
	
	if (row.version_sort === row.latest_limited_version_sort)
		return row.version_number;

	if (row.version_sort >= row.latest_version_sort)
		return row.version_number;

	return <span title={`An upgrade to ${row.package_name} ${row.latest_version_number} is available for this org`} style={{borderRadius: "4px", margin: 0, fontWeight: "bold", padding: "2px 4px 2px 4px"}}
				 className="slds-theme--success">{row.version_number} {'\u279a'} {row.latest_version_number}</span>;
};