import React from 'react';

import * as orgGroupService from '../services/OrgGroupService';
import * as packageVersionService from "../services/PackageVersionService";
import * as upgradeService from "../services/UpgradeService";
import * as licenseService from "../services/LicenseService";
import * as notifier from "../services/notifications";
import * as strings from "../services/strings";
import * as nav from "../services/nav";

import {ORG_GROUP_ICON} from "../Constants";
import {HeaderField, RecordHeader} from '../components/PageHeader';
import GroupFormWindow from "./GroupFormWindow";
import ScheduleUpgradeWindow from "../orgs/ScheduleUpgradeWindow";
import SelectGroupWindow from "../orgs/SelectGroupWindow";
import moment from "moment";
import Tabs from "../components/Tabs";
import GroupMemberVersionCard from "../packageversions/GroupMemberVersionCard";
import GroupMemberOrgCard from "../orgs/GroupMemberOrgCard";
import LicenseCard from "../licenses/LicenseCard";
import UpgradeCard from "../upgrades/UpgradeCard";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import * as authService from "../services/AuthService";

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			user: authService.getSessionUser(this),
			transid: nav.transid(),
			isEditing: false,
			orggroup: {},
			selected: new Map(),
			showSelected: false,
			upgradeablePackageIds: []
		};
		
		this.fetchMembers = this.fetchMembers.bind(this);
		this.fetchVersions = this.fetchVersions.bind(this);
		this.fetchUpgrades = this.fetchUpgrades.bind(this);
		this.fetchLicenses = this.fetchLicenses.bind(this);
		this.resolveUpgradeablePackages = this.resolveUpgradeablePackages.bind(this);
		this.upgradeHandler = this.upgradeHandler.bind(this);
		this.schedulingWindowHandler = this.schedulingWindowHandler.bind(this);
		this.cancelSchedulingHandler = this.cancelSchedulingHandler.bind(this);
		this.saveHandler = this.saveHandler.bind(this);
		this.refreshHandler = this.refreshHandler.bind(this);
		this.upgradeUpdated = this.upgradeUpdated.bind(this);
		this.processingFinished = this.processingFinished.bind(this);
		this.editHandler = this.editHandler.bind(this);
		this.cancelHandler = this.cancelHandler.bind(this);
		this.deleteHandler = this.deleteHandler.bind(this);
		this.addToGroupHandler = this.addToGroupHandler.bind(this);
		this.removeMembersHandler = this.removeMembersHandler.bind(this);
		this.closeGroupWindow = this.closeGroupWindow.bind(this);
		this.addingToGroupHandler = this.addingToGroupHandler.bind(this);
		this.movingToGroupHandler = this.movingToGroupHandler.bind(this);
		this.selectionHandler = this.selectionHandler.bind(this);
		this.versionSelectionHandler = this.versionSelectionHandler.bind(this);
		this.handleShowSelected = this.handleShowSelected.bind(this);
	}

	// Lifecycle
	componentDidMount() {
		notifier.on('upgrade', this.upgradeUpdated);
		notifier.on('group-members', this.processingFinished);
		orgGroupService.requestById(this.props.match.params.orgGroupId).then(orggroup => this.setState({orggroup}));
	}
	
	componentWillUnmount() {
		notifier.remove('upgrade', this.upgradeUpdated);
		notifier.remove('group-members', this.processingFinished);
	}

	render() {
		const {selected, showSelected, orggroup, user} = this.state;
		const actions = [];
		if (orggroup.type === "Upgrade Group") {
			actions.push({handler: this.schedulingWindowHandler, label: "Upgrade Packages", group: "upgrade", disabled: user.read_only || this.state.upgradeablePackageIds.length === 0});
		}
		actions.push(
			{handler: this.refreshHandler, label: "Refresh Versions", spinning: this.state.isRefreshing, detail: "Fetch latest installed package version information for all orgs in this group."},
			{handler: this.editHandler, label: "Edit", disabled: user.read_only, spinning: this.state.isProcessing},
			{handler: this.deleteHandler, label: "Delete", disabled: user.read_only, }
		);
			
		let memberActions = [
			{label: `${selected.size} Selected`, toggled: showSelected, icon: "filterList", group: "selected", handler: this.handleShowSelected, disabled: selected.size === 0,
				detail: showSelected ? "Click to show all records" : "Click to show only records you have selected"},
			{label: "Copy", group: "selection", handler: this.addingToGroupHandler, disabled: user.read_only || selected.size === 0},
			{label: "Move", group: "selection", handler: this.movingToGroupHandler, disabled: user.read_only || selected.size === 0},
			{label: "Remove", group: "selection", handler: this.removeMembersHandler, disabled: user.read_only || selected.size === 0},
		];

		const tabs = [
			<div key="members" label="Members">
				<GroupMemberOrgCard orggroup={orggroup} onFetch={this.fetchMembers} refetchOn="group-members"
									refetchFor={orggroup.id} actions={memberActions}
									selected={selected} showSelected={showSelected} onSelect={this.selectionHandler}/>
			</div>,
			<div key="versions" label="Versions">
				<GroupMemberVersionCard orggroup={orggroup} onFetch={this.fetchVersions} refetchOn="group-versions"
										refetchFor={orggroup.id} actions={memberActions}
										selected={selected} showSelected={showSelected}
										onSelect={this.versionSelectionHandler}/>
			</div>,
			<div key="licenses" label="Licenses">
				<LicenseCard title="Licenses" id="GroupLicenseCard" onFetch={this.fetchLicenses} refetchOn="licenses"/>
			</div>
		];
		if (orggroup.type === "Upgrade Group") {
			tabs.push(
				<div key="upgrades" label="Upgrades">
					<UpgradeCard onFetch={this.fetchUpgrades} refetchOn="upgrades"/>
				</div>);
		}
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
						{tabs}
					</Tabs>
					<DataTableFilterHelp/>
				</div>
				
				{this.state.isEditing ? <GroupFormWindow orggroup={orggroup} onSave={this.saveHandler}
														 onCancel={this.cancelHandler}/> : ""}
				{this.state.schedulingUpgrade ? <ScheduleUpgradeWindow packageIds={this.state.upgradeablePackageIds}
																	   description={`Upgrading Group: ${orggroup.name}`}
																	   onUpgrade={this.upgradeHandler}
																	   onCancel={this.cancelSchedulingHandler}/> : ""}
				{this.state.addingToGroup ?
					<SelectGroupWindow title={`${this.state.removeAfterAdd ? "Move" : "Copy"} ${strings.pluralizeIt(selected, "org").num} ${strings.pluralizeIt(selected, "org").str} to different group`} 
									   excludeId={orggroup.id} removeAfterAdd={this.state.removeAfterAdd}
									   onAdd={this.addToGroupHandler}
									   onCancel={this.closeGroupWindow}/> : ""}
			</div>
		);
	}

	// Handlers
	fetchMembers() {
		return orgGroupService.requestMembers(this.props.match.params.orgGroupId);
	}

	fetchVersions() {
		return new Promise((resolve, reject) => {
			packageVersionService.findByOrgGroupId(this.props.match.params.orgGroupId).then(versions => {
				this.setState({isRefreshing: false, upgradeablePackageIds: this.resolveUpgradeablePackages(versions)});
				resolve(versions);
			}).catch(reject);
		});
	}

	fetchUpgrades() {
		return upgradeService.requestByGroup(this.props.match.params.orgGroupId);
	}

	fetchLicenses() {
		return licenseService.requestByGroup(this.props.match.params.orgGroupId);
	}

	resolveUpgradeablePackages(versions) {
		const packageVersionMap = new Map(versions.map(v => [v.package_id, v]));
		const packageVersionList = Array.from(packageVersionMap.values()).filter(v => v.version_id !== v.latest_limited_version_id);
		packageVersionList.sort(function (a, b) {
			return a.dependency_tier > b.dependency_tier ? 1 : -1;
		});
		return packageVersionList.map(v => v.package_id);
	}

	upgradeHandler(versions, startDate, description) {
		orgGroupService.requestUpgrade(this.state.orggroup.id, versions, startDate, description, this.state.transid).then((res) => {
			if (res.message) {
				notifier.error(res.message, "Failed to Schedule", 7000, res.id ? () => window.location = `/upgrade/${res.id}` : null);
				this.setState({schedulingUpgrade: false});
			}
		});
	}

	upgradeUpdated(res) {
		if (res.transid !== this.state.transid) {
			notifier.info( `The upgrade ${res.description} changed.  Click here to see what is new.`, "Upgrade Status Update", 7000, () => {
				nav.toPath("upgrade", res.id);
			});
			return;  // Otherwise, not our concern.
		}

		if (res.message) {
			notifier.warning(res.message, "Upgrade System Failure", 10000);
		} else {
			nav.toPath("upgrade", res.id);
		}
		this.setState({schedulingUpgrade: false});
	}

	processingFinished(groupId) {
		if (groupId === this.state.orggroup.id) {
			this.setState({isProcessing: false});
		}
	}

	schedulingWindowHandler() {
		this.setState({schedulingUpgrade: true});
	}

	cancelSchedulingHandler() {
		this.setState({schedulingUpgrade: false});
	}

	saveHandler(orggroup) {
		this.setState({isProcessing: true});
		orgGroupService.requestUpdate(orggroup).then((orggroup) => {
			this.setState({orggroup, isEditing: false});
		}).catch(e => notifier.error(e.message | e, orggroup.message, "Fail"));
	}

	refreshHandler() {
		this.setState({isRefreshing: true});
		notifier.emit("refresh-group-versions", this.state.orggroup.id);
	}

	editHandler() {
		this.setState({isEditing: true});
	}

	cancelHandler() {
		this.setState({isEditing: false});
	}

	deleteHandler() {
		if (window.confirm(`Are you sure you want to delete this group?`)) {
			orgGroupService.requestDelete([this.state.orggroup.id]).then(() => {
				nav.toPath("orggroups");
			}).catch(e => notifier.error(e.message, "Delete Failed"));
		}
	}

	addToGroupHandler(groupId, groupName, removeAfterAdd) {
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
				notifier.success(`Moved ${this.state.selected.size} org(s) to ${orggroup.name}`, "Moved orgs", 7000, () => nav.toPath("orggroup", orggroup.id));
			} else {
				notifier.success(`Added ${this.state.selected.size} org(s) to ${orggroup.name}`, "Added orgs", 7000, () => nav.toPath("orggroup", orggroup.id));
			}
			this.state.selected.clear();
			this.setState({showSelected: false, removeAfterAdd: false});
		}).catch(e => notifier.error(e.message, "Addition Failed"));
	}

	removeMembersHandler(skipConfirmation) {
		if (skipConfirmation || window.confirm(`Are you sure you want to remove ${this.state.selected.size} member(s)?`)) {
			orgGroupService.requestRemoveMembers(this.state.orggroup.id, Array.from(this.state.selected.keys())).then(() => {})
			.catch(e => notifier.error(e.message, "Removal Failed"));
			return true;
		}
		return false;
	}

	closeGroupWindow() {
		this.setState({addingToGroup: false});
	}

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
}