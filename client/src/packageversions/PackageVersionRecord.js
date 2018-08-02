import React from 'react';

import {HeaderField, RecordHeader} from '../components/PageHeader';
import {PACKAGE_VERSION_ICON} from "../Constants";
import * as sortage from "../services/sortage";
import * as orgService from "../services/OrgService";
import OrgCard from "../orgs/OrgCard";
import * as packageVersionService from "../services/PackageVersionService";

export default class extends React.Component {
	SORTAGE_KEY = "OrgCard";

	constructor(props) {
		super(props);
		this.state = {
			sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "account_name", "asc")
		};

		packageVersionService.requestById(props.match.params.packageVersionId).then(packageVersion => {
			this.setState({packageVersion})
		});
	}

	requestOrgs = (pageSize, page, sorted, filtered) => {
		const {packageVersion, orgs, sortOrder, lastFiltered, lastSorted} = this.state;
		return new Promise((resolve, reject) => {
			if (orgs && JSON.stringify(lastFiltered) === JSON.stringify(filtered) && JSON.stringify(lastSorted) === JSON.stringify(sorted)) {
				// We already have our full rowset and the filters did not change, so don't go back to the server.
				return resolve({
					rows: orgs.slice(pageSize * page, pageSize * page + pageSize),
					pages: Math.ceil(orgs.length / pageSize)
				});
			}

			orgService.requestByPackageVersion(packageVersion.sfid, sorted.length === 0 ? sortOrder: sortage.changeSortOrder(this.SORTAGE_KEY, sorted[0].id, sorted[0].desc ? "desc" : "asc"), filtered)
			.then(orgs => {
				this.setState({orgs, itemCount: orgs.length, lastFiltered: filtered, lastSorted: sorted});
				// You must return an object containing the rows of the current page, and optionally the total pages number.
				return resolve({
					rows: orgs.slice(pageSize * page, pageSize * page + pageSize),
					pages: Math.ceil(orgs.length / pageSize)
				});
			})
			.catch(reject);
		});
	};

	render() {
		const {packageVersion} = this.state;
		return (
			packageVersion ?
			<div>
				<RecordHeader type="Package Version" icon={PACKAGE_VERSION_ICON} title={`${packageVersion.package_name} ${packageVersion.version_number} (${packageVersion.name})`}>
					<HeaderField label="Package" value={packageVersion.package_name}/>
					<HeaderField label="Number" value={packageVersion.version_number}/>
					<HeaderField label="Name" value={packageVersion.name}/>
					<HeaderField label="ID" value={packageVersion.sfid}/>
					<HeaderField label="Status" value={packageVersion.status}/>
				</RecordHeader>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<OrgCard title="Customers" orgs={this.state.orgs} onRequest={this.requestOrgs}/>
				</div>
			</div> : <div/>
		);
	}
}