import React from 'react';

import * as packageOrgService from '../services/PackageOrgService';

import {HeaderNote, HomeHeader} from '../components/PageHeader';
import PackageOrgList from './PackageOrgList';
import * as authService from "../services/AuthService";
import {NotificationManager} from "react-notifications";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {selected: new Map()};
	}

	fetchData = () => {
		return packageOrgService.requestAll();
	};

	filterHandler = (filtered, filterColumns, itemCount) => {
		this.setState({itemCount});
	};

	newHandler = (event) => {
		this.connectHandler(event.shiftKey ? "https://test.salesforce.com" : "https://login.salesforce.com");
	};

	connectHandler = (instanceUrl) => {
		authService.oauthOrgURL(instanceUrl).then(url => {
			window.location.href = url;
		});
	};

	selectionHandler = (selected) => {
		this.setState({selected});
	};

	refreshHandler = () => {
		this.setState({isRefreshing: true});
		packageOrgService.requestRefresh(Array.from(this.state.selected.keys()))
			.then(() => this.setState({isRefreshing: false}))
			.catch(e => {
				this.setState({isRefreshing: false});
				NotificationManager.error(e, "Refresh Failed");
			});
	};
	
	revokeHandler = () => {
		this.setState({isRevoking: true});
		packageOrgService.requestRevoke(Array.from(this.state.selected.keys()))
			.then(() => this.setState({isRevoking: false}))
			.catch(e => {
				this.setState({isRevoking: false});
				NotificationManager.error(e, "Revoke Failed");
			});
	};

	deleteHandler = () => {
		if (window.confirm(`Are you sure you want to remove ${this.state.selected.size} packaging org(s)?`)) {
			packageOrgService.requestDelete(Array.from(this.state.selected.keys()))
			.then(() => this.setState({isRevoking: false}))
			.catch(e => {
				this.setState({isRevoking: false});
				NotificationManager.error(e, "Delete Failed");
			});
		}
	};

	render() {
		const actions = [
			{label: "Add Org", group: "add", detail: "Shift-click to add sandbox org", handler: this.newHandler},
			{label: "Refresh", handler: this.refreshHandler, disabled: this.state.selected.size === 0, spinning: this.state.isRefreshing, detail: "Refresh the access token of the selected org"},
			{label: "Revoke", handler: this.revokeHandler, disabled: this.state.selected.size === 0, spinning: this.state.isRevoking, detail: "Revoke access to the selected org"},
			{label: "Delete", handler: this.deleteHandler, disabled: this.state.selected.size === 0, detail: "Revoke access to and delete the selected org"}
		];

		return (
			<div>
				<HomeHeader type="package orgs" title="Package Orgs" newLabel="Add Package Org" actions={actions} count={this.state.itemCount}>
					<HeaderNote>Remember that packaging orgs must have the <b>Packaging Push</b> permissions as well
						as <b>Apex Certified</b> Partner</HeaderNote>
				</HomeHeader>
				<PackageOrgList onFetch={this.fetchData.bind(this)} refetchOn="package-orgs" onConnect={this.connectHandler}
								onSelect={this.selectionHandler} onDelete={this.deleteHandler}/>
			</div>
		);
	}
}