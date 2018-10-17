import React from 'react';

import * as notifier from "../services/notifications";
import * as orgService from '../services/OrgService';
import * as packageVersionService from "../services/PackageVersionService";
import * as orgGroupService from "../services/OrgGroupService";
import * as upgradeJobService from "../services/UpgradeJobService";

import {ORG_ICON} from "../Constants";
import {HeaderField, RecordHeader} from '../components/PageHeader';
import ScheduleUpgradeWindow from "./ScheduleUpgradeWindow";
import SelectGroupWindow from "./SelectGroupWindow";
import InstalledVersionCard from "../packageversions/InstalledVersionCard";
import UpgradeJobCard from "../upgrades/UpgradeJobCard";
import Tabs from "../components/Tabs";
import {DataTableFilterHelp} from "../components/DataTableFilter";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {org: {}, upgradeablePackageIds: []};
		
		this.fetchVersions = this.fetchVersions.bind(this);
		this.fetchJobs = this.fetchJobs.bind(this);
		this.upgradeHandler = this.upgradeHandler.bind(this);
		this.refreshHandler = this.refreshHandler.bind(this);
		this.closeSchedulerWindow = this.closeSchedulerWindow.bind(this);
		this.openSchedulerWindow = this.openSchedulerWindow.bind(this);
		this.addToGroupHandler = this.addToGroupHandler.bind(this);
		this.openGroupWindow = this.openGroupWindow.bind(this);
		this.closeGroupWindow = this.closeGroupWindow.bind(this);
	}

	// Lifecycle
	componentDidMount() {
		orgService.requestById(this.props.match.params.orgId).then(org => this.setState({org}));
	}
	
	render() {
		const actions = [
			{
				label: "Upgrade Packages",
				handler: this.openSchedulerWindow,
				group: "upgrade",
				disabled: this.state.upgradeablePackageIds.length === 0
			},
			{
				label: "Add To Group", 
				handler: this.openGroupWindow
			},
			{
				label: "Refresh Versions",
				handler: this.refreshHandler,
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


				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<Tabs id="UpgradeRecord">
						<div label="Versions">
							<InstalledVersionCard onFetch={this.fetchVersions} refetchOn="org-versions" refetchFor={this.state.org.org_id}/>
						</div>
						<div label="Upgrade Jobs">
							<UpgradeJobCard id="OrgJobCard" onFetch={this.fetchJobs} refetchOn="upgrade-jobs"/>
						</div>
					</Tabs>
					<DataTableFilterHelp/>
				</div>
				{this.state.addingToGroup ? <SelectGroupWindow title="Add this org to a group" onAdd={this.addToGroupHandler}
															   onCancel={this.closeGroupWindow}/> : ""}
				{this.state.schedulingUpgrade ?
					<ScheduleUpgradeWindow org={this.state.org} packageIds={this.state.upgradeablePackageIds}
										   onUpgrade={this.upgradeHandler} onCancel={this.closeSchedulerWindow}/> : ""}
			</div>
		);
	}

	// Handlers
	fetchVersions() {
		return new Promise((resolve, reject) => {
			packageVersionService.findByLicensedOrgId(this.props.match.params.orgId).then(versions => {
				let upgradeablePackageIds = this.resolveUpgradeablePackages(versions);
				this.setState({isRefreshing: false, upgradeablePackageIds});
				resolve(versions);
			}).catch(reject);
		});
	}
	
	fetchJobs() {
		return new Promise((resolve, reject) => {
			upgradeJobService.requestAllJobsByOrg(this.props.match.params.orgId).then(jobs => {
				resolve(jobs);
			}).catch(reject);
		});
	}
	
	upgradeHandler(versions, startDate, description) {
		orgService.requestUpgrade(this.state.org.org_id, versions, startDate, description).then((res) => {
			this.setState({schedulingUpgrade: false});
			if (res.message) {
				notifier.error(res.message, "Failed to Schedule", 7000, () => window.location = `/upgrade/${res.id}`);
			} else {
				window.location = `/upgrade/${res.id}`;
			}
		});
	}

	refreshHandler() {
		this.setState({isRefreshing: true});
		notifier.emit("refresh-org-versions", this.state.org.org_id);
	}

	closeSchedulerWindow() {
		this.setState({schedulingUpgrade: false});
	}

	openSchedulerWindow() {
		this.setState({schedulingUpgrade: true});
	}

	addToGroupHandler(groupId, groupName) {
		this.setState({addingToGroup: false});
		orgGroupService.requestAddMembers(groupId, groupName, [this.state.org.org_id]).then((orggroup) => {
			notifier.success(`Added org to ${orggroup.name}`, "Added orgs", 7000, () => window.location = `/orggroup/${orggroup.id}`);
			orgService.requestById(this.state.org.org_id).then(org => this.setState({org}));
		});
	}

	closeGroupWindow() {
		this.setState({addingToGroup: false});
	}

	openGroupWindow() {
		this.setState({addingToGroup: true});
	}

	// Utilities
	resolveUpgradeablePackages(versions) {
		const packageVersionMap = new Map(versions.map(v => [v.package_id, v]));
		const packageVersionList = Array.from(packageVersionMap.values()).filter(v => v.version_id !== v.latest_limited_version_id);
		packageVersionList.sort(function (a, b) {
			return a.dependency_tier > b.dependency_tier ? 1 : -1;
		});
		return packageVersionList.map(v => v.package_id);
	}
}