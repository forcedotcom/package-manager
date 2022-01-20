import React from 'react';

import * as packageOrgService from '../services/PackageOrgService';
import * as authService from "../services/AuthService";
import * as notifier from '../services/notifications';

import {HeaderField, RecordHeader} from '../components/PageHeader';
import PackageOrgView from "./PackageOrgView";
import {Messages, PACKAGE_ORG_ICON} from "../Constants";
import EditPackageOrgWindow from "./EditPackageOrgWindow";
import * as nav from "../services/nav";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			user: authService.getSessionUser(this),
			packageorg: {}
		};
		
		this.fetchData = this.fetchData.bind(this);
		this.connectHandler = this.connectHandler.bind(this);
		this.exportHandler = this.exportHandler.bind(this);
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
		let {packageorg, user} = this.state;
		let actions = [
			{label: packageorg.active ? 'Deactivate' : 'Activate', group: "toggle",
				handler: this.activationHandler,
				disabled: user.read_only || packageorg.type !== "Package",
				detail: user.read_only ? Messages.READ_ONLY_USER : packageorg.active ? "Click to deactivate this org connection" : "Click to activate this org connection"},
			{label: "Connect", group: "actions",
				handler: this.connectHandler, disabled: user.read_only || packageorg.status === "Connected",
				detail: user.read_only ? Messages.READ_ONLY_USER : "Click to login and connect this org"},
			{label: "Export", group: "actions",
				handler: this.exportHandler, disabled: user.read_only || packageorg.status !== "Connected",
				detail: user.read_only ? Messages.READ_ONLY_USER : "Click to export org details"},
			{label: "Refresh", handler: this.refreshHandler, group: "actions",
				disabled: user.read_only || packageorg.status !== "Connected",
				detail: user.read_only ? Messages.READ_ONLY_USER : "",
				spinning: this.state.isRefreshing},
			{label: "Revoke", handler: this.revokeHandler, group: "actions",
				disabled: user.read_only || packageorg.status !== "Connected",
				detail: user.read_only ? Messages.READ_ONLY_USER : "",
				spinning: this.state.isRevoking},
			{label: "Edit", handler: this.editHandler,
				disabled: user.read_only,
				detail: user.read_only ? Messages.READ_ONLY_USER : ""
			},
			{label: "Delete", handler: this.deleteHandler,
				disabled: user.read_only,
				detail: user.read_only ? Messages.READ_ONLY_USER : ""
			}
		];

		return (
			<div>
				<RecordHeader type="Connected Org" icon={PACKAGE_ORG_ICON} title={packageorg.name}
							  actions={actions} parent={{label: "Orgs", location: `/packageorgs`}}>
					<HeaderField label="Org ID" value={packageorg.org_id}/>
					<HeaderField label="Description" value={packageorg.description}/>
					<HeaderField label="Type" value={packageorg.type}/>
				</RecordHeader>
				<PackageOrgView packageorg={packageorg}/>
				{this.state.isEditing ?
					<EditPackageOrgWindow packageorg={packageorg} onSave={this.saveHandler}
										  onCancel={this.cancelHandler}/> : ""}
			</div>
		);
	}
	
	// Handlers
	fetchData() {
		packageOrgService.requestById(this.props.match.params.packageorgId).then(
			packageorg => this.setState({packageorg, isRefreshing: false})).catch(e => notifier.error(e.message || e));
	}

	connectHandler() {
		authService.oauthOrgURL(this.state.packageorg.instance_url, this.state.packageorg.type, `/packageorg/${this.state.packageorg.org_id}`).then(url => {
			window.location.href = url;
		});
	}

	exportHandler() {
		authService.exportOrgURL(this.state.packageorg.instance_url, this.state.packageorg.type, `/packageorg/${this.state.packageorg.org_id}`).then(url => {
			window.open(url, "export", "left=100,top=100,width=540,height=600");
		});
	}

	activationHandler() {
		if (!this.state.packageorg.active || window.confirm(`Are you sure you want to deactivate this org connection?`)) {
			packageOrgService.requestActivation([this.state.packageorg.org_id], !this.state.packageorg.active)
				.then((packageorg) => this.setState({packageorg}));
		}
	}

	deleteHandler() {
		if (window.confirm(`Are you sure you want to remove this org connection?`)) {
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
