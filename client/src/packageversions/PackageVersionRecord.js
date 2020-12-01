import React from 'react';

import {HeaderField, RecordHeader} from '../components/PageHeader';
import {PACKAGE_VERSION_ICON} from "../Constants";
import * as orgService from "../services/OrgService";
import OrgCard from "../orgs/OrgCard";
import * as packageVersionService from "../services/PackageVersionService";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import * as notifier from "../services/notifications";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {packageVersion: {}};

		packageVersionService.requestById(props.match.params.versionId).then(packageVersion => {
			this.setState({packageVersion})
		}).catch(error => notifier.error(error.message, error.subject || "Failed Request", 10000, () => {window.history.back()}));

		this.fetchOrgs = this.fetchOrgs.bind(this);
		this.fetchBlacklist = this.fetchBlacklist.bind(this);
	}

	// Lifecycle
	render() {
		const {packageVersion} = this.state;
		return (
			<div>
				<RecordHeader type="Package Version" icon={PACKAGE_VERSION_ICON} title={`${packageVersion.package_name} ${packageVersion.version_number} (${packageVersion.name})`}
							  parent={{label: "Package", location: `/package/${this.state.packageVersion.package_id}`}}>
					<HeaderField label="Package" value={packageVersion.package_name}/>
					<HeaderField label="Number" value={packageVersion.version_number}/>
					<HeaderField label="Name" value={packageVersion.name}/>
					<HeaderField label="ID" value={packageVersion.version_id}/>
					<HeaderField label="Status" value={packageVersion.status}/>
					<HeaderField label="Created" value={packageVersion.created_date} format="datetime"/>
					<HeaderField label="Released" value={packageVersion.release_date} format="datetime"/>
				</RecordHeader>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<OrgCard id="PackageVersionMembers" title="Customers" withLicenseData={true} onFetch={this.fetchOrgs} onFetchBlacklist={this.fetchBlacklist}/>
					<DataTableFilterHelp/>
				</div>
			</div>
		);
	}

	// Handlers
	fetchOrgs() {
		return orgService.requestByPackageVersion(this.props.match.params.versionId);
	}

	fetchBlacklist() {
		return orgService.requestByPackageVersion(this.props.match.params.versionId, true);
	}
}
