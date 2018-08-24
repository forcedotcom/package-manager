import React from 'react';

import * as orgService from '../services/OrgService';
import * as packageVersionService from "../services/PackageVersionService";

import {HeaderField, RecordHeader} from '../components/PageHeader';
import ScheduleUpgradeWindow from "./ScheduleUpgradeWindow";
import {ORG_ICON} from "../Constants";
import * as orgGroupService from "../services/OrgGroupService";
import SelectGroupWindow from "./SelectGroupWindow";
import InstalledVersionCard from "../packageversions/InstalledVersionCard";
import * as notifier from "../services/notifications";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {org: {}, upgradeablePackageIds: []};
	}

	fetchVersions = () => {
		return new Promise((resolve, reject) => {
			packageVersionService.findByLicensedOrgId(this.props.match.params.orgId).then(versions => {
				let upgradeablePackageIds = this.resolveUpgradeablePackages(versions);
				this.setState({upgradeablePackageIds});
				resolve(versions);
			}).catch(reject);
		});
	};
	componentDidMount() {
		orgService.requestById(this.props.match.params.orgId).then(org => this.setState({org}));
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
		orgService.requestUpgrade(this.state.org.org_id, versions, startDate, description).then((res) => {
			this.setState({schedulingUpgrade: false});
			if (res.message) {
				notifier.error(res.message, "Upgrade failed");
			} else {
				window.location = `/upgrade/${res.id}`;
			}
		});
	};

	refreshHandler = () => {
		this.setState({isRefreshing: true});
		notifier.emit("refresh-org-versions", this.state.org.org_id);
	};

	closeSchedulerWindow = () => {
		this.setState({schedulingUpgrade: false});
	};

	openSchedulerWindow = () => {
		this.setState({schedulingUpgrade: true});
	};

	addToGroupHandler = (groupId, groupName) => {
		this.setState({addingToGroup: false});
		orgGroupService.requestAddMembers(groupId, groupName, [this.state.org.org_id]).then((orggroup) => {
			notifier.success(`Added org to ${orggroup.name}`, "Added orgs", 7000, () => window.location = `/orggroup/${orggroup.id}`);
			orgService.requestById(this.state.org.org_id).then(org => this.setState({org}));
		});
	};

	closeGroupWindow = () => {
		this.setState({addingToGroup: false});
	};

	openGroupWindow = () => {
		this.setState({addingToGroup: true});
	};

	render() {
		const actions = [
			{
				label: "Upgrade Packages",
				group: "upgrade",
				disabled: this.state.upgradeablePackageIds.length === 0,
				handler: this.openSchedulerWindow
			},
			{label: "Add To Group", handler: this.openGroupWindow},
			{
				handler: this.refreshHandler,
				label: "Refresh Versions",
				spinning: this.state.isRefreshing,
				detail: "Fetch latest installed package version information for this org."
			},
		];
		return (
			<div>
				<RecordHeader type="Org" icon={ORG_ICON} title={this.state.org.account_name} actions={actions}
							  parent={{label: "Orgs", location: `/orgs`}}>
					<HeaderField label="Name" value={this.state.org.name}/>
					<HeaderField label="Org ID" value={this.state.org.org_id}/>
					<HeaderField label="Instance" value={this.state.org.instance}/>
					<HeaderField label="Type" value={this.state.org.type}/>
					<HeaderField label="Features" value={this.state.org.features}/>
					<HeaderField label="Groups" value={this.state.org.groups}/>
				</RecordHeader>
				<div className="slds-form--stacked slds-grid slds-wrap slds-m-top--medium">
					<div className="slds-col--padded slds-size--1-of-1">
						<InstalledVersionCard onFetch={this.fetchVersions.bind(this)} refetchOn="org-versions"/>
					</div>
				</div>
				{this.state.addingToGroup ? <SelectGroupWindow title="Add this org to a group" onAdd={this.addToGroupHandler.bind(this)}
															   onCancel={this.closeGroupWindow}/> : ""}
				{this.state.schedulingUpgrade ?
					<ScheduleUpgradeWindow org={this.state.org} packageIds={this.state.upgradeablePackageIds}
										   onUpgrade={this.upgradeHandler} onCancel={this.closeSchedulerWindow}/> : ""}
			</div>
		);
	}
}