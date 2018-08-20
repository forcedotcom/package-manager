import React from 'react';

import * as orgGroupService from '../services/OrgGroupService';
import * as packageVersionService from "../services/PackageVersionService";
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
import {DataTableFilterHelp} from "../components/DataTableFilter";
import * as strings from "../services/strings";

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			isEditing: false,
			orggroup: {},
			selected: new Map(),
			showSelected: false,
			upgradeablePackageIds: []
		};
	}

	fetchMembers = () => {
		return orgGroupService.requestMembers(this.props.match.params.orgGroupId);
	};
	
	fetchVersions = () => {
		return new Promise((resolve, reject) => {
			packageVersionService.findByOrgGroupId(this.props.match.params.orgGroupId).then(versions => {
				this.setState({upgradeablePackageIds: this.resolveUpgradeablePackages(versions)});
				resolve(versions);
			}).catch(reject);
		});
	};
	
	componentDidMount() {
		notifier.on('group', this.groupRefreshed);

		orgGroupService.requestById(this.props.match.params.orgGroupId).then(orggroup => this.setState({orggroup}));
	}
	
	componentWillUnmount() {
		notifier.remove('group', this.groupRefreshed);
	}

	resolveUpgradeablePackages = (versions) => {
		const packageVersionMap = new Map(versions.map(v => [v.package_id, v]));
		const packageVersionList = Array.from(packageVersionMap.values()).filter(v => v.version_id !== v.latest_limited_version_id);
		packageVersionList.sort(function (a, b) {
			return a.dependency_tier > b.dependency_tier ? 1 : -1;
		});
		return packageVersionList.map(v => v.package_id);
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
		this.setState({isProcessing: true});
		orgGroupService.requestUpdate(orggroup).then(() => {
			this.setState({orggroup, isEditing: false});
		}).catch(e => notifier.error(e.message | e, orggroup.message, "Fail"));
	};

	refreshHandler = () => {
		this.setState({isRefreshing: true});
		notifier.emit("refresh-group-versions", this.state.orggroup.id);
	};
	
	groupRefreshed = (groupId) => {
		if (this.state.orggroup.id === groupId) {
			try {
				this.setState({isProcessing: false, isEditing: false});
			} catch(e) {
				this.setState({isProcessing: false, isEditing: false});
				notifier.error(e.message, "Refresh Failed");
			}
		}
	};

	editHandler = () => {
		this.setState({isEditing: true});
	};

	cancelHandler = () => {
		this.setState({isEditing: false});
	};

	deleteHandler = () => {
		if (window.confirm(`Are you sure you want to delete this group?`)) {
			orgGroupService.requestDelete([this.state.orggroup.id]).then(() => {
				window.location = '/orggroups';
			}).catch(e => notifier.error(e.message, "Delete Failed"));
		}
	};

	removeMembersHandler = (skipConfirmation) => {
		if (skipConfirmation || window.confirm(`Are you sure you want to remove ${this.state.selected.size} member(s)?`)) {
			orgGroupService.requestRemoveMembers(this.state.orggroup.id, Array.from(this.state.selected.keys())).then(() => {})
				.catch(e => notifier.error(e.message, "Removal Failed"));
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
		let showSelected = this.state.showSelected;
		if (selected.size === 0) {
			showSelected = false;
		}
		this.setState({selected, showSelected});
	};
	
	versionSelectionHandler = (selected) => {
		this.setState({selectedVersions: selected});
	};
	
	handleShowSelected = () => {
		this.setState({showSelected: !this.state.showSelected});
	};
	
	exportHandler = () => {
		this.setState({isExporting: true, exportable: this.state.members});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	};

	render() {
		const {selected, selectedVersions, showSelected, orggroup} = this.state;
		const actions = [];
		if (orggroup.type === "Upgrade Group") {
			actions.push({handler: this.schedulingWindowHandler, label: "Upgrade Packages", group: "upgrade", disabled: this.state.upgradeablePackageIds.length === 0});
		}
		actions.push(
			{handler: this.refreshHandler, label: "Refresh Versions", spinning: this.state.isRefreshing, detail: "Fetch latest installed package version information for all orgs in this group."},
			{handler: this.editHandler, label: "Edit", spinning: this.state.isProcessing},
			{handler: this.deleteHandler, label: "Delete"}
		);
			
		let memberActions = [
			{label: `${selected.size} Selected`, toggled: showSelected, group: "selected", handler: this.handleShowSelected, disabled: selected.size === 0,
				detail: showSelected ? "Click to show all records" : "Click to show only records you have selected"},
			{label: "Copy To Group", handler: this.addingToGroupHandler, disabled: selected.size === 0},
			{label: "Move To Group", handler: this.movingToGroupHandler, disabled: selected.size === 0},
			{label: "Remove From Group", group: "remove", handler: this.removeMembersHandler, disabled: selected.size === 0},
			{label: "Export Members", handler: this.exportHandler}
		];
		
		return (
			<div>
				<RecordHeader type="Org Group" icon={ORG_GROUP_ICON} title={orggroup.name} actions={actions}
							  parent={{label: "Groups", location: `/orggroups`}}>
					<HeaderField label="Type" value={orggroup.type}/>
					<HeaderField label="Description" value={orggroup.description}/>
					{orggroup.created_date ? <HeaderField label="Created" value={moment(orggroup.created_date).format("lll")}/> : ""}
				</RecordHeader>

				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<Tabs id="OrgGroupView">
						<div label="Members">
							<GroupMemberOrgCard orggroup={orggroup} onFetch={this.fetchMembers.bind(this)} refetchOn="group-members" actions={memberActions}
												selected={selected} showSelected={showSelected} onSelect={this.selectionHandler}/>
						</div>
						<div label="Versions">
							<GroupMemberVersionCard orggroup={orggroup} onFetch={this.fetchVersions.bind(this)} refetchOn="group-versions" actions={memberActions}
													selected={selectedVersions} showSelected={showSelected} onSelect={this.versionSelectionHandler}/>
						</div>
					</Tabs>
					<DataTableFilterHelp/>
				</div>
				
				{this.state.isEditing ? <GroupFormWindow orggroup={orggroup} onSave={this.saveHandler}
														 onCancel={this.cancelHandler}/> : ""}
				{this.state.schedulingUpgrade ? <ScheduleUpgradeWindow packageIds={this.state.upgradeablePackageIds}
																	   description={`Upgrading Group: ${orggroup.name}`}
																	   onUpgrade={this.upgradeHandler.bind(this)}
																	   onCancel={this.cancelSchedulingHandler}/> : ""}
				{this.state.addingToGroup ?
					<SelectGroupWindow title={`${this.state.removeAfterAdd ? "Move" : "Copy"} ${strings.pluralizeIt(selected, "org").num} ${strings.pluralizeIt(selected, "org").str} to different group`} 
									   excludeId={orggroup.id} removeAfterAdd={this.state.removeAfterAdd}
									   onAdd={this.addToGroupHandler.bind(this)}
									   onCancel={this.closeGroupWindow}/> : ""}
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} target="_blank" /> : ""}
			</div>
		);
	}
}