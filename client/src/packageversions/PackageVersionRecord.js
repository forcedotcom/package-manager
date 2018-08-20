import React from 'react';

import {HeaderField, RecordHeader} from '../components/PageHeader';
import {PACKAGE_VERSION_ICON} from "../Constants";
import * as orgService from "../services/OrgService";
import OrgCard from "../orgs/OrgCard";
import * as packageVersionService from "../services/PackageVersionService";
import {DataTableFilterHelp} from "../components/DataTableFilter";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {packageVersion: {}};
		
		packageVersionService.requestById(props.match.params.packageVersionId).then(packageVersion => {
			this.setState({packageVersion})
		});
	}

	fetchOrgs = () => {
		return orgService.requestByPackageVersion(this.state.packageVersion.sfid);
	};

	render() {
		const {packageVersion} = this.state;
		return (
			<div>
				<RecordHeader type="Package Version" icon={PACKAGE_VERSION_ICON} title={`${packageVersion.package_name} ${packageVersion.version_number} (${packageVersion.name})`}
							  parent={{label: "Package", location: `/package/${this.state.packageVersion.package_id}`}}>
					<HeaderField label="Package" value={packageVersion.package_name}/>
					<HeaderField label="Number" value={packageVersion.version_number}/>
					<HeaderField label="Name" value={packageVersion.name}/>
					<HeaderField label="ID" value={packageVersion.sfid}/>
					<HeaderField label="Status" value={packageVersion.status}/>
				</RecordHeader>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<OrgCard title="Customers" onFetch={this.fetchOrgs}/>
					<DataTableFilterHelp/>
				</div>
			</div>
		);
	}
}