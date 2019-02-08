import React from 'react';

import * as packageOrgService from '../services/PackageOrgService';
import * as notifier from '../services/notifications';

import {HeaderField, RecordHeader} from '../components/PageHeader';
import PackageOrgView from "./PackageOrgView";
import {PACKAGE_ORG_ICON} from "../Constants";
import EditPackageOrgWindow from "./EditPackageOrgWindow";
import * as nav from "../services/nav";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			packageorg: {}
		};
		
		this.fetchData = this.fetchData.bind(this);
		this.activationHandler = this.activationHandler.bind(this);
		this.deleteHandler = this.deleteHandler.bind(this);
		this.refreshHandler = this.refreshHandler.bind(this);
		this.revokeHandler = this.revokeHandler.bind(this);
		this.editHandler = this.editHandler.bind(this);
		this.cancelHandler = this.cancelHandler.bind(this);
		this.saveHandler = this.saveHandler.bind(this);
	}

	// Lifecycle
	componentDidMount() {
		notifier.on("package-orgs", this.fetchData.bind(this));
		this.fetchData();
	}
	
	componentWillUnmount() {
		notifier.remove("package-orgs", this.fetchData);	
	}
	
	render() {
		let packageorg = this.state.packageorg;
		let actions = [
			{label: packageorg.active ? 'Active' : 'Inactive', toggled: packageorg.active, icon: "none", group: "toggle",
				handler: this.activationHandler, disabled: packageorg.type !== "Package",
				detail: packageorg.active ? "Click to deactivate this package org" : "Click to activate this package org"},
			{label: "Refresh", handler: this.refreshHandler, group: "actions", spinning: this.state.isRefreshing},
			{label: "Revoke", handler: this.revokeHandler, group: "actions", spinning: this.state.isRevoking},
			{label: "Edit", handler: this.editHandler},
			{label: "Delete", handler: this.deleteHandler}
		];

		return (
			<div>
				<RecordHeader type="Org Connection" icon={PACKAGE_ORG_ICON} title={this.state.packageorg.name}
							  actions={actions} parent={{label: "Orgs", location: `/packageorgs`}}>
					<HeaderField label="Org ID" value={this.state.packageorg.org_id}/>
					<HeaderField label="Description" value={this.state.packageorg.description}/>
					<HeaderField label="Type" value={this.state.packageorg.type}/>
				</RecordHeader>
				<PackageOrgView packageorg={this.state.packageorg}/>
				{this.state.isEditing ?
					<EditPackageOrgWindow packageorg={this.state.packageorg} onSave={this.saveHandler}
										  onCancel={this.cancelHandler}/> : ""}
			</div>
		);
	}
	
	// Handlers
	fetchData() {
		packageOrgService.requestById(this.props.match.params.packageorgId).then(
			packageorg => this.setState({packageorg, isRefreshing: false}));
	}

	activationHandler() {
		if (!this.state.packageorg.active || window.confirm(`Are you sure you want to deactivate this packaging org?`)) {
			packageOrgService.requestActivation([this.state.packageorg.org_id], !this.state.packageorg.active)
				.then((packageorg) => this.setState({packageorg}));
		}
	}

	deleteHandler() {
		if (window.confirm(`Are you sure you want to remove this packaging org?`)) {
			packageOrgService.requestDelete([this.state.packageorg.org_id]).then(() => {
				nav.toPath("packageorgs");
			});
		}
	}

	refreshHandler() {
		this.setState({isRefreshing: true});
		packageOrgService.requestRefresh([this.state.packageorg.org_id]).then(() => {})
		.catch(e => {
			this.setState({isRefreshing: false});
			notifier.error(e.message, "Refresh Failed");
		});
	}

	revokeHandler() {
		this.setState({isRevoking: true});
		packageOrgService.requestRevoke([this.state.packageorg.org_id]).then(() => {
			packageOrgService.requestById(this.state.packageorg.org_id).then(
				packageorg => this.setState({packageorg, isRevoking: false}));
		}).catch(e => {
			this.setState({isRevoking: false});
			notifier.error(e.message, "Revoke Failed");
		});
	}

	editHandler() {
		this.setState({isEditing: true});
	}

	cancelHandler() {
		this.setState({isEditing: false});
	}

	saveHandler(packageorg) {
		packageOrgService.requestUpdate(packageorg).then((packageorg) => {
			this.setState({packageorg, isEditing: false});
		});
	}
}