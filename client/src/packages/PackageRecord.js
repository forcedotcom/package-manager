import React from 'react';

import * as packageService from '../services/PackageService';

import {HeaderField, RecordHeader} from '../components/PageHeader';
import {PACKAGE_ICON} from "../Constants";
import Tabs from "../components/Tabs";
import PackageVersionCard from "../packageversions/PackageVersionCard";
import OrgCard from "../orgs/OrgCard";
import * as sortage from "../services/sortage";
import * as packageVersionService from "../services/PackageVersionService";
import * as orgService from "../services/OrgService";

export default class extends React.Component {
	SORTAGE_KEY_VERSIONS = "PackageVersionCard";
	SORTAGE_KEY_ORGS = "OrgCard";

	constructor(props) {
		super(props);
	
		this.state = {
			sortOrderVersions: sortage.getSortOrder(this.SORTAGE_KEY_VERSIONS, "name", "asc"),
			sortOrderOrgs: sortage.getSortOrder(this.SORTAGE_KEY_ORGS, "account_name", "asc")
		};
		
		packageService.requestById(props.match.params.packageId).then(pkg => {
			this.setState({pkg})
		});

		packageVersionService.findByPackage(props.match.params.packageId, this.state.sortOrderVersions).then(packageVersions => {
			this.setState({packageVersions})
		});
	}

	requestOrgs = (pageSize, page, sorted, filtered) => {
		const {pkg, orgs, sortOrderOrgs, lastFiltered, lastSorted} = this.state;
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
	
	render() {
		const {pkg} = this.state; 
		return (
			pkg ?
			<div>
				<RecordHeader type="Package" icon={PACKAGE_ICON} title={pkg.name}>
					<HeaderField label="ID" value={pkg.sfid}/>
					<HeaderField label="Packaging Org ID" value={pkg.package_org_id}/>
					<HeaderField label="Package ID" value={pkg.package_id}/>
				</RecordHeader>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<Tabs id="PackageView">
						<div label="Versions">
							<PackageVersionCard packageVersions={this.state.packageVersions}/>
						</div>
						<div label="Customers">
							<OrgCard title="Customers" orgs={this.state.orgs} onRequest={this.requestOrgs} />
						</div>
					</Tabs>
				</div>
			</div> : <div/>
		);
	}
}