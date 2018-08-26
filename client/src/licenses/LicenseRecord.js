import React from 'react';

import * as licenseService from '../services/LicenseService';

import {HeaderField, RecordHeader} from '../components/PageHeader';
import LicenseView from "./LicenseView";
import {LICENSE_ICON} from "../Constants";
import * as notifier from "../services/notifications";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {license: {}};
	}
	
	// Lifecycle
	componentDidMount() {
		licenseService.requestById(this.props.match.params.licenseId).then(license => this.setState({license}))
		.catch(error => notifier.error(error.message, error.subject || "Failed Request", 10000, () => {window.history.back()}));
	}

	render() {
		return (
			<div>
				<RecordHeader type="License" icon={LICENSE_ICON} title={this.state.license.account_name}
							  parent={{label: "Licenses", location: `/licenses`}}>
					<HeaderField label="Name" value={this.state.license.name}/>
					<HeaderField label="Version Name" value={this.state.license.version_name}/>
					<HeaderField label="Version Number" value={this.state.license.version_number}/>
					<HeaderField label="Status" value={this.state.license.status}/>
					<HeaderField label="Date Installed" format="date" value={this.state.license.install_date}/>
				</RecordHeader>
				<LicenseView license={this.state.license}/>
			</div>
		);
	}
}