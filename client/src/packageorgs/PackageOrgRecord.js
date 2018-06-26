import React from 'react';

import * as packageOrgService from '../services/PackageOrgService';

import {HeaderField, RecordHeader} from '../components/PageHeader';
import PackageOrgView from "./PackageOrgView";
import {PACKAGE_ORG_ICON} from "../Constants";
import EditPackageOrgWindow from "./EditPackageOrgWindow";

export default class extends React.Component {
	state = {packageorg: {}};

	componentDidMount() {
		let packageorgId = this.props.match.params.packageorgId;
		packageOrgService.requestById(packageorgId).then(packageorg => this.setState({packageorg}));
	}

	deleteHandler = () => {
		if (window.confirm(`Are you sure you want to remove this packaging org?`)) {
			packageOrgService.requestDelete([this.state.packageorg.org_id]).then(() => {
				window.location = '/packageorgs';
			});
		}
	};

	refreshHandler = () => {
		this.setState({isRefreshing: true});
		packageOrgService.requestRefresh([this.state.packageorg.org_id]).then((packageorgs) => {
			this.setState({packageorg: packageorgs[0], isRefreshing: false});
		});
	};

	editHandler = () => {
		this.setState({isEditing: true});
	};

	cancelHandler = () => {
		this.setState({isEditing: false});
	};

	saveHandler = (packageorg) => {
		packageOrgService.requestUpdate(packageorg).then((packageorg) => {
			this.setState({packageorg, isEditing: false});
		});
	};

	render() {

		let actions = [
			{label: "Refresh", handler: this.refreshHandler, spinning: this.state.isRefreshing},
			{label: "Edit", handler: this.editHandler},
			{label: "Delete", handler: this.deleteHandler}
		];

		return (
			<div>
				<RecordHeader type="Package Org" icon={PACKAGE_ORG_ICON} title={this.state.packageorg.name}
							  actions={actions}>
					<HeaderField label="Description" value={this.state.packageorg.description}/>
					<HeaderField label="Org ID" value={this.state.packageorg.org_id}/>
					<HeaderField label="Type" value={this.state.packageorg.type}/>
				</RecordHeader>
				<PackageOrgView packageorg={this.state.packageorg}/>
				{this.state.isEditing ?
					<EditPackageOrgWindow packageorg={this.state.packageorg} onSave={this.saveHandler}
										  onCancel={this.cancelHandler}/> : ""}
			</div>
		);
	}
}