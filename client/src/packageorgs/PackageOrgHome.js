import React from 'react';

import * as packageOrgService from '../services/PackageOrgService';

import * as notifier from "../services/notifications";
import {HeaderNote, HomeHeader} from '../components/PageHeader';
import PackageOrgList from './PackageOrgList';
import * as authService from "../services/AuthService";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {selected: new Map()};
		
		this.fetchData = this.fetchData.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
		this.newHandler = this.newHandler.bind(this);
		this.connectHandler = this.connectHandler.bind(this);
		this.selectionHandler = this.selectionHandler.bind(this);
		this.refreshHandler = this.refreshHandler.bind(this);
		this.revokeHandler = this.revokeHandler.bind(this);
		this.deleteHandler = this.deleteHandler.bind(this);
	}

	// Lifecycle
	render() {
		const actions = [
			{label: "Add Org", group: "add", detail: "Shift-click to add sandbox org", handler: this.newHandler},
			{label: "Refresh", handler: this.refreshHandler, disabled: this.state.selected.size === 0, spinning: this.state.isRefreshing, detail: "Refresh the access token of the selected org"},
			{label: "Revoke", handler: this.revokeHandler, disabled: this.state.selected.size === 0, spinning: this.state.isRevoking, detail: "Revoke access to the selected org"},
			{label: "Delete", handler: this.deleteHandler, disabled: this.state.selected.size === 0, spinning: this.state.isDeleting, detail: "Revoke access to and delete the selected org entry"}
		];

		return (
			<div>
				<HomeHeader type="org connections" title="Org Connections" newLabel="Add Org Connection" actions={actions} count={this.state.itemCount}>
					<HeaderNote>Remember that packaging orgs must have the <b>Packaging Push</b> permissions as well
						as <b>Apex Certified</b> Partner</HeaderNote>
				</HomeHeader>
				<PackageOrgList onFetch={this.fetchData.bind(this)} refetchOn="package-orgs" onConnect={this.connectHandler}
								onSelect={this.selectionHandler} onDelete={this.deleteHandler}/>
			</div>
		);
	}
	
	// Handlers
	fetchData() {
		return packageOrgService.requestAll();
	}

	filterHandler (filtered, filterColumns, itemCount) {
		this.setState({itemCount});
	}

	newHandler(event) {
		this.connectHandler(event.shiftKey ? "https://test.salesforce.com" : "https://login.salesforce.com");
	}

	connectHandler(instanceUrl, type) {
		authService.oauthOrgURL(instanceUrl, type).then(url => {
			window.location.href = url;
		});
	}

	selectionHandler(selected) {
		this.setState({selected});
	}

	refreshHandler() {
		this.setState({isRefreshing: true});
		packageOrgService.requestRefresh(Array.from(this.state.selected.keys()))
		.then(() => this.setState({isRefreshing: false}))
		.catch(e => {
			this.setState({isRefreshing: false});
			notifier.error(e.message, "Refresh Failed");
		});
	}

	revokeHandler() {
		this.setState({isRevoking: true});
		packageOrgService.requestRevoke(Array.from(this.state.selected.keys()))
		.then(() => this.setState({isRevoking: false}))
		.catch(e => {
			this.setState({isRevoking: false});
			notifier.error(e.message, "Revoke Failed");
		});
	}

	deleteHandler() {
		if (window.confirm(`Are you sure you want to remove ${this.state.selected.size} packaging org(s)?`)) {
			this.setState({isDeleting: true});
			packageOrgService.requestDelete(Array.from(this.state.selected.keys()))
			.then(() => this.setState({isDeleting: false}))
			.catch(e => {
				this.setState({isDeleting: false});
				notifier.error(e.message, "Delete Failed");
			});
		}
	}
}