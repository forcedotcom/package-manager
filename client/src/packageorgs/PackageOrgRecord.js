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

		let actions = [
			{label: "Refresh", handler: this.refreshHandler, spinning: this.state.isRefreshing},
			{label: "Revoke", handler: this.revokeHandler, spinning: this.state.isRevoking},
			{label: "Edit", handler: this.editHandler},
			{label: "Delete", handler: this.deleteHandler}
		];

		return (
			<div>
				<RecordHeader type="Package Org" icon={PACKAGE_ORG_ICON} title={this.state.packageorg.name}
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