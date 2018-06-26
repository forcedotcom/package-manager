import React from 'react';

import * as orgGroupService from '../services/OrgGroupService';
import * as packageVersionService from "../services/PackageVersionService";
import * as sortage from "../services/sortage";
import {NotificationManager} from 'react-notifications';
import * as io from "socket.io-client";


import {ORG_GROUP_ICON} from "../Constants";
import {HeaderField, RecordHeader} from '../components/PageHeader';
import OrgGroupView from "./OrgGroupView";
import GroupFormWindow from "./GroupFormWindow";
import ScheduleUpgradeWindow from "../orgs/ScheduleUpgradeWindow";
import SelectGroupWindow from "../orgs/SelectGroupWindow";

export default class extends React.Component {
	SORTAGE_KEY_VERSIONS = "GroupMemberVersionCard";

	state = {
		isEditing: false,
		orggroup: {},
		sortOrderVersions: sortage.getSortOrder(this.SORTAGE_KEY_VERSIONS, "org_id", "asc"),
		selected: [],
	};

	componentDidMount() {
		this.setState({socket: io.connect()});
		orgGroupService.requestById(this.props.match.params.orgGroupId).then(orggroup => {
			orgGroupService.requestMembers(orggroup.id).then(members => this.setState({orggroup, members}));
		});
		packageVersionService.findByOrgGroupId(this.props.match.params.orgGroupId, this.state.sortOrderVersions).then(versions => {
			let validVersions = this.stripVersions(versions);
			this.setState({versions, validVersions});
		});
	}

	stripVersions = (versions) => {
		let validSet = {};
		for (let i = 0; i < versions.length; i++) {
			let v = versions[i];
			if (!validSet[v.package_id] && v.license_status !== 'Uninstalled' && v.license_status !== 'Suspended'
				&& v.version_id !== v.latest_version_id) {
				validSet[v.package_id] = v;
			}
		}
		const validVersions = [];
		Object.entries(validSet).forEach(([key, val]) => {validVersions.push(val)});
		return validVersions.length > 0 ? validVersions : null;
	};

	upgradeHandler = (versions, startDate, description) => {
		orgGroupService.requestUpgrade(this.state.orggroup.id, versions.map(v => v.latest_version_id), startDate, description).then((res) => {
			this.setState({schedulingUpgrade: false});
			if (res.message) {
				NotificationManager.error(res.message, "Upgrade failed");
			} else {
				window.location = `/upgrade/${res.id}`;
			}
		});
	};

	cancelSchedulingHandler = () => {
		this.setState({schedulingUpgrade: false});
	};

	schedulingWindowHandler = () => {
		this.setState({schedulingUpgrade: true});
	};


	saveHandler = (orggroup) => {
		orgGroupService.requestUpdate(orggroup).then(() => {
			this.setState({orggroup, isEditing: false});
			if (orggroup.orgIds.length !== 0) {
				// Reload our kids because our membership may have changed
				orgGroupService.requestMembers(orggroup.id).then(members => this.setState({members}));
				packageVersionService.findByOrgGroupId(orggroup.id, this.state.sortOrderVersions).then(versions => {
					let validVersions = this.stripVersions(versions);
					this.setState({versions, validVersions});
				});

			}
		}).catch(e => console.error(e));
	};

	refreshHandler = () => {
		this.setState({isRefreshing: true});
		this.state.socket.emit("refresh-versions", this.state.orggroup.id);
		this.state.socket.on('refresh-versions', this.versionsRefreshed);
	};

	versionsRefreshed = (groupId) => {
		if (this.state.orggroup.id === groupId) {
			// Reload our versions because they may have changed
			packageVersionService.findByOrgGroupId(this.state.orggroup.id, this.state.sortOrderVersions).then(versions => {
				let validVersions = this.stripVersions(versions);
				this.setState({versions, validVersions, isRefreshing: false});
			}).catch(e => {
				this.setState({isRefreshing: false});
				NotificationManager.error(e.message, "Refresh Failed");
			});
		}
	};

	editHandler = () => {
		this.setState({isEditing: true});
	};

	cancelHandler = () => {
		this.setState({isEditing: false});
	};

	deleteHandler = () => {
		orgGroupService.requestDelete([this.state.orggroup.id]).then(() => {
			window.location = '/orggroups';
		}).catch(e => NotificationManager.error(e.message, "Delete Failed"));
	};

	removeMembersHandler = (skipConfirmation) => {
		if (skipConfirmation || window.confirm(`Are you sure you want to remove ${this.state.selected.length} member(s)?`)) {
			orgGroupService.requestRemoveMembers(this.state.orggroup.id, this.state.selected).then(members => {
				packageVersionService.findByOrgGroupId(this.state.orggroup.id, this.state.sortOrderVersions).then(versions => {
					let validVersions = this.stripVersions(versions);
					this.setState({members, versions, validVersions, selected: []});
				});
			}).catch(e => NotificationManager.error(e.message, "Removal Failed"));
			return true;
		}
		return false;
	};

	addToGroupHandler = (groupId, groupName, removeAfterAdd) => {
		if (removeAfterAdd && !window.confirm(`Are you sure you want to move ${this.state.selected.length} member(s) to ${groupName}?`)) {
			this.setState({addingToGroup: false, removeAfterAdd: false});
			return;
		}
		this.setState({addingToGroup: false});
		orgGroupService.requestAddMembers(groupId, groupName, this.state.selected).then((orggroup) => {
			let moved = false;
			if (removeAfterAdd) {
				moved = this.removeMembersHandler(true);
			}
			if (moved) {
				NotificationManager.success(`Moved ${this.state.selected.length} org(s) to ${orggroup.name}`, "Moved orgs", 7000, () => window.location = `/orggroup/${orggroup.id}`);
			} else {
				NotificationManager.success(`Added ${this.state.selected.length} org(s) to ${orggroup.name}`, "Added orgs", 7000, () => window.location = `/orggroup/${orggroup.id}`);
			}
			this.setState({selected: [], removeAfterAdd: false});
		}).catch(e => NotificationManager.error(e.message, "Addition Failed"));
	};

	closeGroupWindow = () => {
		this.setState({addingToGroup: false});
	};

	addingToGroupHandler = () => {
		this.setState({addingToGroup: true});
	};

	movingToGroupHandler = () => {
		this.setState({addingToGroup: true, removeAfterAdd: true});
	};

	selectionHandler = (selected) => {
		this.setState({selected});
	};

	render() {
		let actions = [
			{
				handler: this.schedulingWindowHandler,
				label: "Upgrade Packages",
				group: "upgrade",
				disabled: !this.state.validVersions
			},
			{
				handler: this.refreshHandler,
				label: "Refresh Versions",
				spinning: this.state.isRefreshing,
				detail: "Fetch latest installed package version information for all orgs in this group."
			},
			{handler: this.editHandler, label: "Edit"},
			{handler: this.deleteHandler, label: "Delete"}];

		let memberActions = [
			{label: "Copy To Group", handler: this.addingToGroupHandler, disabled: this.state.selected.length === 0},
			{label: "Move To Group", handler: this.movingToGroupHandler, disabled: this.state.selected.length === 0},
			{
				label: "Remove From Group",
				group: "remove",
				handler: this.removeMembersHandler,
				disabled: this.state.selected.length === 0
			}];

		return (
			<div>
				<RecordHeader type="Org Group" icon={ORG_GROUP_ICON} title={this.state.orggroup.name} actions={actions}>
					<HeaderField label="" value={this.state.orggroup.description}/>
				</RecordHeader>
				<OrgGroupView orggroup={this.state.orggroup} versions={this.state.versions} members={this.state.members}
							  onSelect={this.selectionHandler} memberActions={memberActions}
							  selected={this.state.selected}/>;
				{this.state.isEditing ? <GroupFormWindow orggroup={this.state.orggroup} onSave={this.saveHandler}
														 onCancel={this.cancelHandler}/> : ""}
				{this.state.schedulingUpgrade ? <ScheduleUpgradeWindow versions={this.state.validVersions}
																	   description={`Upgrading Group: ${this.state.orggroup.name}`}
																	   onUpgrade={this.upgradeHandler.bind(this)}
																	   onCancel={this.cancelSchedulingHandler}/> : ""}
				{this.state.addingToGroup ?
					<SelectGroupWindow excludeId={this.state.orggroup.id} removeAfterAdd={this.state.removeAfterAdd}
									   onAdd={this.addToGroupHandler.bind(this)}
									   onCancel={this.closeGroupWindow}/> : ""}
			</div>
		);
	}
}