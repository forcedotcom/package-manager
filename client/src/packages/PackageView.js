import React from 'react';

import * as packageVersionService from "../services/PackageVersionService";
import * as orgService from "../services/OrgService";
import * as sortage from '../services/sortage';

import PackageVersionCard from '../packageversions/PackageVersionCard';
import OrgCard from "../orgs/OrgCard";
import Tabs from '../components/Tabs';


export default class extends React.Component {
	SORTAGE_KEY_VERSIONS = "PackageVersionCard";
	SORTAGE_KEY_ORGS = "OrgCard";

	state = {
		sortOrderVersions: sortage.getSortOrder(this.SORTAGE_KEY_VERSIONS, "name", "asc"),
		sortOrderOrgs: sortage.getSortOrder(this.SORTAGE_KEY_ORGS, "account_name", "asc")
	};

	requestOrgs = (pageSize, page, sorted, filtered) => {
		const {orgs, pkg, sortOrderOrgs, lastFiltered, lastSorted} = this.state;
		return new Promise((resolve, reject) => {
			if (orgs && JSON.stringify(lastFiltered) === JSON.stringify(filtered) && JSON.stringify(lastSorted) === JSON.stringify(sorted)) {
				// We already have our full rowset and the filters did not change, so don't go back to the server.
				return resolve({
					rows: orgs.slice(pageSize * page, pageSize * page + pageSize),
					pages: Math.ceil(orgs.length / pageSize)
				});
			}

			orgService.requestByPackage(pkg.sfid, sorted.length === 0 ? sortOrderOrgs : sortage.changeSortOrder(this.SORTAGE_KEY_ORGS, sorted[0].id, sorted[0].desc ? "desc" : "asc"), filtered)
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
	
	componentWillReceiveProps(props) {
		if (props.pkg.sfid) {
			this.setState({pkg: props.pkg});
			packageVersionService.findByPackage(props.pkg.sfid, this.state.sortOrderVersions).then(packageVersions => this.setState({packageVersions}));
		}
	};

	render() {
		return (
			this.state.pkg ? 
			<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
				<Tabs id="PackageView">
					<div label="Versions">
						<PackageVersionCard packageVersions={this.state.packageVersions}/>
					</div>
					<div label="Customers">
						<OrgCard title="Customers" orgs={this.state.orgs} onRequest={this.requestOrgs} />
					</div>
				</Tabs>
			</div> : ""
		);
	}
}