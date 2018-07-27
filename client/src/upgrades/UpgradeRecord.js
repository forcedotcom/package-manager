import React from 'react';

import * as upgradeService from '../services/UpgradeService';

import {HeaderField, HeaderNote, RecordHeader} from '../components/PageHeader';
import * as upgradeItemService from "../services/UpgradeItemService";
import * as upgradeJobService from "../services/UpgradeJobService";
import * as sortage from "../services/sortage";
import {isDoneStatus, Status, UPGRADE_ICON} from "../Constants";
import UpgradeItemCard from "./UpgradeItemCard";
import ProgressBar from "../components/ProgressBar";
import UpgradeJobCard from "./UpgradeJobCard";
import Tabs from "../components/Tabs";
import {NotificationManager} from "react-notifications";
import moment from "moment";
import * as notifier from "../services/notifications";

export default class extends React.Component {
	SORTAGE_KEY_ITEMS = "UpgradeItemCard";
	SORTAGE_KEY_JOBS = "UpgradeRecord.UpgradeJobCard";

	state = {
		upgrade: {},
		sortOrderItems: sortage.getSortOrder(this.SORTAGE_KEY_ITEMS, "p.dependency_tier", "asc"),
		sortOrderJobs: sortage.getSortOrder(this.SORTAGE_KEY_JOBS, "id", "asc")
	};

	componentDidMount() {
		notifier.on('upgrade', this.upgradeUpdated);
		notifier.on('upgrade-items', this.upgradeItemsUpdated);
		notifier.on('upgrade-jobs', this.upgradeJobsUpdated);

		upgradeService.requestById(this.props.match.params.upgradeId).then(upgrade => this.setState({upgrade}));
		upgradeItemService.findByUpgrade(this.props.match.params.upgradeId, this.state.sortOrderItems).then(items => {
			this.setState({items});
		});
		upgradeJobService.requestAllJobsInUpgrade(this.props.match.params.upgradeId, this.state.sortOrderJobs).then(jobs => {
			this.setState({jobs});
		});
	}

	componentWillUnmount() {
		notifier.remove('upgrade', this.upgradeUpdated);
		notifier.remove('upgrade-items', this.upgradeItemsUpdated);
		notifier.remove('upgrade-jobs', this.upgradeJobsUpdated);
	}

	upgradeUpdated = (upgrade) => {
		if (this.state.upgrade.id === upgrade.id) {
			this.setState({upgrade});
		}
	};
	
	upgradeItemsUpdated = (items) => {
		const mine = items.filter(i => i.upgrade_id === this.state.upgrade.id);
		if (mine.length > 0) {
			// At least one of these is from our upgrade, so just reload all of them
			upgradeItemService.findByUpgrade(this.props.match.params.upgradeId, this.state.sortOrderItems).then(items => {
				this.setState({items});
			});
		}
	};
	
	upgradeJobsUpdated = (jobs) => {
		const mine = jobs.filter(j => j.upgrade_id === this.state.upgrade.id);
		if (mine.length > 0) {
			// At least one of these is from our upgrade, so just reload all of them
			upgradeJobService.requestAllJobsInUpgrade(this.props.match.params.upgradeId, this.state.sortOrderJobs).then(jobs => {
				this.setState({jobs});
			});
		}
	};
	
	activationHandler = () => {
		if (window.confirm(`Are you sure you want to activate this upgrade?`)) {
			upgradeService.activate(this.state.upgrade.id).then(() => window.location.reload());
		}
	};

	cancellationHandler = () => {
		if (window.confirm(`Are you sure you want to cancel this upgrade?  All ${this.state.items.length} request(s) will be cancelled.`)) {
			upgradeService.cancel(this.state.upgrade.id).then(() => window.location.reload());
		}
	};

	retryHandler = () => {
		if (window.confirm(`Are you sure you want to retry this upgrade?  Only failed jobs will be rescheduled.`)) {
			this.setState({isRetrying: true});
			upgradeService.retry(this.state.upgrade.id).then((upgrade) => window.location = `/upgrade/${upgrade.id}`)
			.catch((e) => {
				this.setState({isRetrying: false});
				NotificationManager.error(e.message, "Retry Failed");
			});
		}
	};

	render() {
		let userCanActivate = true;
		let user = JSON.parse(sessionStorage.getItem("user"));
		if (user) {
			userCanActivate = user.enforce_activation_policy === "false" || (this.state.upgrade.created_by != null && this.state.upgrade.created_by !== user.username);
		}

		const itemNotes = [];
		if (!userCanActivate) {
			itemNotes.push(<HeaderNote key="activation_warning">Activation is disabled. The same user that scheduled an
				upgrade cannot activate it.</HeaderNote>)
		} else if (!user || user.enforce_activation_policy === "false") {
			itemNotes.push(<HeaderNote key="activation_warning">Activation policy enforcement is disabled for testing
				purposes. THIS IS NOT ALLOWED IN PRODUCTION.</HeaderNote>)
		}

		const actions = [
			{
				label: "Activate Upgrade", handler: this.activationHandler.bind(this),
				disabled: this.state.upgrade.item_status === "Done" || !userCanActivate,
				detail: "Update items in this upgrade to Pending state"
			},
			{
				label: "Cancel Upgrade", handler: this.cancellationHandler.bind(this),
				disabled: this.state.upgrade.item_status === "Done"
			},
			{
				label: "Retry Upgrade", handler: this.retryHandler.bind(this),
				disabled: !(this.state.upgrade.item_status === "Done" && this.state.hasFailedJobs), spinning: this.state.isRetrying
			}
		];

		let count = this.state.items ? this.state.items.length : 0, completed = 0, errors = 0;
		for (let i = 0; i < count; i++) {
			let item = this.state.items[i];
			if (isDoneStatus(item.status)) {
				completed++;
			}
			if (item.status === Status.Failed) {
				errors++;
			}
		}
		return (
			<div>
				<RecordHeader type="Upgrade" icon={UPGRADE_ICON} title={this.state.upgrade.description} actions={actions}>
					<HeaderField label="Created By" value={this.state.upgrade.created_by}/>
					<HeaderField label="Scheduled Start Time" value={`${moment(this.state.upgrade.start_time).format('lll')} (${moment(this.state.upgrade.start_time).fromNow()})`}/>
					<HeaderField label="Status" value={this.state.upgrade.status}/>
				</RecordHeader>
				<ProgressBar progress={completed / count} success={errors === 0}/>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<Tabs id="UpgradeRecord">
						<div label="Requests">
							<UpgradeItemCard upgrade={this.state.upgrade} notes={itemNotes} items={this.state.items}/>
						</div>
						<div label="Jobs">
							<UpgradeJobCard jobs={this.state.jobs}/>
						</div>
					</Tabs>
				</div>
			</div>
		);
	}
}