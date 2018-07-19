import React from 'react';
import {NotificationManager} from 'react-notifications';

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
	state = {org: {}};

	componentDidMount() {
		notifier.on('org-versions', this.versionsRefreshed);

		orgService.requestById(this.props.match.params.orgId).then(org => this.setState({org}));
		packageVersionService.findByLicensedOrgId(this.props.match.params.orgId).then(versions => {
			let validVersions = this.stripInvalidVersions(versions);
			this.setState({versions, validVersions});
		}).catch(e => {
			notifier.error(e.message || e || "What happened?", "Catastrophic Failure");
		});
	}

	componentWillUnmount() {
		notifier.remove('org-versions', this.versionsRefreshed);
	}

	stripInvalidVersions = (versions) => {
		let valid = [];
		for (let i = 0; i < versions.length; i++) {
			let v = versions[i];
			if (v.license_status !== 'Uninstalled' && v.license_status !== 'Suspended'
				&& v.version_id !== v.latest_version_id) {
				valid.push(v);
			}
		}
		return valid.length > 0 ? valid : null;
	};
	
	upgradeHandler = (versions, startDate, description) => {
		orgService.requestUpgrade(this.state.org.org_id, versions, startDate, description).then((res) => {
			if (res.message) {
				NotificationManager.error(res.message, "Upgrade failed");
			} else {
				window.location = `/upgrade/${res.id}`;
			}
		});
	};

	refreshHandler = () => {
		this.setState({isRefreshing: true});
		notifier.emit("refresh-org-versions", this.state.org.id);
	};

	versionsRefreshed = (orgId) => {
		if (this.state.org.id === orgId) {
			// Reload our versions because they may have changed
			packageVersionService.findByLicensedOrgId(this.props.match.params.orgId).then(versions => {
				let validVersions = this.stripInvalidVersions(versions);
				this.setState({isRefreshing: false, versions, validVersions});
			}).catch(e => {
				this.setState({isRefreshing: false});
				notifier.error(e.message, "Refresh Failed");
			});
		}
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
			NotificationManager.success(`Added org to ${orggroup.name}`, "Added orgs", 7000, () => window.location = `/orggroup/${orggroup.id}`);
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
				disabled: !this.state.validVersions,
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
				<RecordHeader type="Org" icon={ORG_ICON} title={this.state.org.account_name} actions={actions}>
					<HeaderField label="Name" value={this.state.org.name}/>
					<HeaderField label="Org ID" value={this.state.org.org_id}/>
					<HeaderField label="Instance" value={this.state.org.instance}/>
					<HeaderField label="Type" value={this.state.org.is_sandbox ? "Sandbox" : "Production"}/>
					<HeaderField label="Features" value={this.state.org.features}/>
					<HeaderField label="Groups" value={this.state.org.groups}/>
				</RecordHeader>
				<div className="slds-form--stacked slds-grid slds-wrap slds-m-top--medium">
					<div className="slds-col--padded slds-size--1-of-1">
						<InstalledVersionCard packageVersions={this.state.versions}/>
					</div>
				</div>
				{this.state.addingToGroup ? <SelectGroupWindow onAdd={this.addToGroupHandler.bind(this)}
															   onCancel={this.closeGroupWindow}/> : ""}
				{this.state.schedulingUpgrade ?
					<ScheduleUpgradeWindow org={this.state.org} versions={this.state.validVersions}
										   onUpgrade={this.upgradeHandler} onCancel={this.closeSchedulerWindow}/> : ""}
			</div>
		);
	}
}