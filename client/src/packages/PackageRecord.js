import React from 'react';

import * as packageService from '../services/PackageService';

import {HeaderField, RecordHeader} from '../components/PageHeader';
import {PACKAGE_ICON} from "../Constants";
import Tabs from "../components/Tabs";
import PackageVersionCard from "../packageversions/PackageVersionCard";
import OrgCard from "../orgs/OrgCard";
import * as packageVersionService from "../services/PackageVersionService";
import * as orgService from "../services/OrgService";
import {DataTableFilterHelp} from "../components/DataTableFilter";

export default class extends React.Component {

	constructor(props) {
		super(props);
	
		this.state = {
			pkg: {},
		};
		
		packageService.requestById(props.match.params.packageId).then(pkg => this.setState({pkg}));
	}

	fetchVersions = () => {
		return packageVersionService.findByPackage(this.state.pkg.sfid)
	};
	
	fetchOrgs = () => {
		return orgService.requestByPackage(this.state.pkg.sfid)
	};
	
	render() {
		const {pkg} = this.state; 
		return (
			<div>
				<RecordHeader type="Package" icon={PACKAGE_ICON} title={pkg.name}
							  parent={{label: "Packages", location: `/packages`}}>
					<HeaderField label="ID" value={pkg.sfid}/>
					<HeaderField label="Packaging Org ID" value={pkg.package_org_id}/>
					<HeaderField label="Package ID" value={pkg.package_id}/>
				</RecordHeader>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<Tabs id="PackageView">
						<div label="Versions">
							<PackageVersionCard onFetch={this.fetchVersions}/>
						</div>
						<div label="Customers">
							<OrgCard title="Customers" onFetch={this.fetchOrgs} />
						</div>
					</Tabs>
					<DataTableFilterHelp/>
				</div>
			</div> 
		);
	}
}