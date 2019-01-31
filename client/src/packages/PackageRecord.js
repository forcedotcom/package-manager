import React from 'react';

import * as packageService from '../services/PackageService';

import * as packageVersionService from "../services/PackageVersionService";
import * as upgradeItemService from "../services/UpgradeItemService";
import * as orgService from "../services/OrgService";

import {PACKAGE_ICON} from "../Constants";
import Tabs from "../components/Tabs";
import {HeaderField, RecordHeader} from '../components/PageHeader';
import {DataTableFilterHelp} from "../components/DataTableFilter";
import PackageVersionCard from "../packageversions/PackageVersionCard";
import OrgCard from "../orgs/OrgCard";
import UpgradeItemCard from "../upgrades/UpgradeItemCard";

export default class extends React.Component {
	constructor(props) {
		super(props);
	
		this.state = {
			pkg: {},
		};
		
		packageService.requestById(props.match.params.packageId).then(pkg => this.setState({pkg}));
		
		this.fetchVersions = this.fetchVersions.bind(this);
		this.fetchUpgradeItems = this.fetchUpgradeItems.bind(this);
		this.fetchOrgs = this.fetchOrgs.bind(this);
		this.fetchBlacklist = this.fetchBlacklist.bind(this);
	}

	// Lifecycle
	render() {
		const {pkg} = this.state; 
		return (
			<div>
				<RecordHeader type="Package" icon={PACKAGE_ICON} title={pkg.name}
							  parent={{label: "Packages", location: `/packages`}}>
					<HeaderField label="ID" value={pkg.sfid}/>
					<HeaderField label="Packaging Org ID" value={pkg.package_org_id}/>
					<HeaderField label="Package ID" value={pkg.package_id}/>
					<HeaderField label="Tier" value={pkg.dependency_tier}/>
				</RecordHeader>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<Tabs id="PackageView">
						<div label="Versions">
							<PackageVersionCard onFetch={this.fetchVersions}/>
						</div>
						<div label="Customers">
							<OrgCard id="PackageMembers" title="Customers" onFetch={this.fetchOrgs} onFetchBlacklist={this.fetchBlacklist}/>
						</div>
						<div label="Upgrades">
							<UpgradeItemCard id="PackageUpgradeItemCard" onFetch={this.fetchUpgradeItems} refetchOn="upgrade-items,upgrade-jobs"/>
						</div>
					</Tabs>
					<DataTableFilterHelp/>
				</div>
			</div> 
		);
	}
	
	// Handlers
	fetchVersions() {
		return packageVersionService.findByPackage(this.props.match.params.packageId)
	}

	fetchUpgradeItems() {
		return upgradeItemService.findByPackage(this.props.match.params.packageId);
	};

	fetchOrgs() {
		return orgService.requestByPackage(this.props.match.params.packageId)
	}

	fetchBlacklist() {
		return orgService.requestByPackage(this.props.match.params.packageId, true)
	}

}