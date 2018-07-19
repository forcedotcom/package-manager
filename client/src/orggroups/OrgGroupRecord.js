import React from 'react';

import * as orgGroupService from '../services/OrgGroupService';
import * as packageVersionService from "../services/PackageVersionService";
import * as sortage from "../services/sortage";
import * as notifier from "../services/notifications";
import {CSVDownload} from 'react-csv';

import {ORG_GROUP_ICON} from "../Constants";
import {HeaderField, RecordHeader} from '../components/PageHeader';
import GroupFormWindow from "./GroupFormWindow";
import ScheduleUpgradeWindow from "../orgs/ScheduleUpgradeWindow";
import SelectGroupWindow from "../orgs/SelectGroupWindow";
import moment from "moment";
import Tabs from "../components/Tabs";
import GroupMemberVersionCard from "../packageversions/GroupMemberVersionCard";
import GroupMemberOrgCard from "../orgs/GroupMemberOrgCard";


export default class extends React.Component {
	SORTAGE_KEY_VERSIONS = "GroupMemberVersionCard";

	state = {
		isEditing: false,
		orggroup: {},
		sortOrderVersions: sortage.getSortOrder(this.SORTAGE_KEY_VERSIONS, "org_id", "asc"),
		selected: new Map(),
		showSelected: false
	};

	componentDidMount() {
		notifier.on('refresh-versions', this.versionsRefreshed);
		notifier.on('refresh-group', this.groupRefreshed);

		orgGroupService.requestById(this.props.match.params.orgGroupId).then(orggroup => {
			orgGroupService.requestMembers(orggroup.id).then(members => {
				this.setState({orggroup, members});
			});
		});
		packageVersionService.findByOrgGroupId(this.props.match.params.orgGroupId, this.state.sortOrderVersions).then(versions => {
			let validVersions = this.stripVersions(versions);
			this.setState({versions, validVersions});
		});
	}
	
	componentWillUnmount() {
		notifier.remove('refresh-versions', this.versionsRefreshed);
		notifier.remove('refresh-group', this.groupRefreshed);
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
		validVersions.sort(function (a, b) {
			return a.dependency_tier > b.dependency_tier ? 1 : -1;
		});
		return validVersions.length > 0 ? validVersions : null;
	};

	upgradeHandler = (versions, startDate, description) => {
		orgGroupService.requestUpgrade(this.state.orggroup.id, versions, startDate, description).then((res) => {
			this.setState({schedulingUpgrade: false});
			if (res.message) {
				notifier.error(res.message, "Upgrade failed");
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
			this.setState({orggroup});
		}).catch(e => console.error(e));
	};

	refreshHandler = () => {
		this.setState({isRefreshing: true});
		notifier.emit("refresh-versions", this.state.orggroup.id);
	};

	versionsRefreshed = (groupId) => {
		if (this.state.orggroup.id === groupId) {
			// Reload our versions because they may have changed
			packageVersionService.findByOrgGroupId(this.state.orggroup.id, this.state.sortOrderVersions).then(versions => {
				let validVersions = this.stripVersions(versions);
				this.setState({versions, validVersions, isRefreshing: false});
			}).catch(e => {
				this.setState({isRefreshing: false});
				notifier.error(e.message, "Refresh Failed");
			});
		}
	};

	groupRefreshed = (groupId) => {
		if (this.state.orggroup.id === groupId) {
			this.versionsRefreshed(groupId);
			orgGroupService.requestMembers(groupId)
			.then(members => this.setState({members, isEditing: false}))
			.catch(e => {
				this.setState({isEditing: false});
				notifier.error(e.message, "Refresh Failed");
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
		}).catch(e => notifier.error(e.message, "Delete Failed"));
	};

	removeMembersHandler = (skipConfirmation) => {
		if (skipConfirmation || window.confirm(`Are you sure you want to remove ${this.state.selected.size} member(s)?`)) {
			orgGroupService.requestRemoveMembers(this.state.orggroup.id, Array.from(this.state.selected.keys())).then(members => {
				packageVersionService.findByOrgGroupId(this.state.orggroup.id, this.state.sortOrderVersions).then(versions => {
					this.state.selected.clear();
					const validVersions = this.stripVersions(versions);
					this.setState({showSelected: false, members, versions, validVersions});
				});
			}).catch(e => notifier.error(e.message, "Removal Failed"));
			return true;
		}
		return false;
	};

	addToGroupHandler = (groupId, groupName, removeAfterAdd) => {
		if (removeAfterAdd && !window.confirm(`Are you sure you want to move ${this.state.selected.size} member(s) to ${groupName}?`)) {
			this.setState({addingToGroup: false, removeAfterAdd: false});
			return;
		}
		this.setState({addingToGroup: false});
		orgGroupService.requestAddMembers(groupId, groupName, Array.from(this.state.selected.keys())).then((orggroup) => {
			let moved = false;
			if (removeAfterAdd) {
				moved = this.removeMembersHandler(true);
			}
			if (moved) {
				notifier.success(`Moved ${this.state.selected.size} org(s) to ${orggroup.name}`, "Moved orgs", 7000, () => window.location = `/orggroup/${orggroup.id}`);
			} else {
				notifier.success(`Added ${this.state.selected.size} org(s) to ${orggroup.name}`, "Added orgs", 7000, () => window.location = `/orggroup/${orggroup.id}`);
			}
			this.state.selected.clear();
			this.setState({showSelected: false, removeAfterAdd: false});
		}).catch(e => notifier.error(e.message, "Addition Failed"));
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
	
	handleShowSelected = () => {
		this.setState({showSelected: !this.state.showSelected});
	};
	
	selectVersionsFromSelected = (selectedMap) => {
		return this.state.versions.filter(v => selectedMap.has(v.org_id));
	};

	exportHandler = () => {
		this.setState({isExporting: true, exportable: this.state.members});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
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
			{label: `${this.state.selected.size} Selected`, toggled: this.state.showSelected, group: "selected", handler: this.handleShowSelected, disabled: this.state.selected.size === 0,
				detail: this.state.showSelected ? "Click to show all records" : "Click to show only records you have selected"},
			{label: "Copy To Group", handler: this.addingToGroupHandler, disabled: this.state.selected.size === 0},
			{label: "Move To Group", handler: this.movingToGroupHandler, disabled: this.state.selected.size === 0},
			{label: "Remove From Group", group: "remove", handler: this.removeMembersHandler, disabled: this.state.selected.size === 0},
			{label: "Export Members", handler: this.exportHandler}
			];
		
		return (
			<div>
				<RecordHeader type="Org Group" icon={ORG_GROUP_ICON} title={this.state.orggroup.name} actions={actions}>
					<HeaderField label="Description" value={this.state.orggroup.description}/>
					{this.state.orggroup.created_date ? <HeaderField label="Created" value={moment(this.state.orggroup.created_date).format("lll")}/> : ""}
				</RecordHeader>

				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<Tabs id="OrgGroupView">
						<div label="Members">
							<GroupMemberOrgCard orggroup={this.state.orggroup} orgs={this.state.showSelected ? Array.from(this.state.selected.values()) : this.state.members}
												onSelect={this.selectionHandler} actions={memberActions}
												selected={this.state.selected}/>
						</div>
						<div label="Versions">
							<GroupMemberVersionCard orggroup={this.state.orggroup} packageVersions={this.state.showSelected ? this.selectVersionsFromSelected(this.state.selected) : this.state.versions}
													onSelect={this.selectionHandler} actions={memberActions}
													selected={this.state.selected}/>
						</div>
					</Tabs>
				</div>
				
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
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} target="_blank" /> : ""}
			</div>
		);
	}
}