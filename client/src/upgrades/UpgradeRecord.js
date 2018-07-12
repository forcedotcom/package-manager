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

export default class extends React.Component {
	SORTAGE_KEY_ITEMS = "UpgradeItemCard";
	SORTAGE_KEY_JOBS = "UpgradeRecord.UpgradeJobCard";

	state = {
		selected: [],
		upgrade: {},
		sortOrderItems: sortage.getSortOrder(this.SORTAGE_KEY_ITEMS, "id", "asc"),
		sortOrderJobs: sortage.getSortOrder(this.SORTAGE_KEY_JOBS, "id", "asc"),
		items: []
	};

	componentDidMount() {
		upgradeService.requestById(this.props.match.params.upgradeId).then(upgrade => this.setState({upgrade}));
		upgradeItemService.findByUpgrade(this.props.match.params.upgradeId, this.state.sortOrderItems, true).then(items => {
			this.setState({items});
			this.checkItemStatus();
		});
		upgradeJobService.requestAllJobsInUpgrade(this.props.match.params.upgradeId, this.state.sortOrderJobs).then(jobs => {
			this.setState({jobs});
			this.checkJobStatus();
		});
	}

	checkItemStatus() {
		let shouldPing = this.state.upgrade.status === "Active";
		if (!shouldPing)
			return; // All of our items are done, so don't bother pinging.

		const secondsDelay = 3;
		console.log(`Checking upgrade item status again in ${secondsDelay} seconds`);
		setTimeout(this.fetchItemStatus.bind(this), (secondsDelay) * 1000);
	}

	fetchItemStatus() {
		upgradeItemService.findByUpgrade(this.state.upgrade.id, this.state.sortOrderItems, true).then(items => {
			this.setState({items});
			this.checkItemStatus();
		});
	}

	checkJobStatus() {
		let shouldPing = this.state.upgrade.status === "Active";
		if (!shouldPing)
			return; // All of our items are done, so don't bother pinging.

		let foundOne = false;
		for (let i = 0; i < this.state.jobs.length && !foundOne; i++) {
			const job = this.state.jobs[i];
			if (!isDoneStatus(job.status))
				foundOne = true;
			else if (job.status === Status.Succeeded && job.current_version_number !== job.version_number)
				foundOne = true;
		}

		if (!foundOne)
			return; // All of our jobs are done, so don't bother pinging.

		// Use a simpleton variable delay based on number of jobs
		const secondsDelay = 5 + this.state.jobs.length / 100;
		console.log(`Checking job status again in ${secondsDelay} seconds`);
		setTimeout(this.fetchJobStatus.bind(this), (secondsDelay) * 1000);
	}

	fetchJobStatus = () => {
		this.setState({isFetchingStatus: true});
		upgradeJobService.requestAllJobsInUpgrade(this.props.match.params.upgradeId, this.state.sortOrderJobs, true).then(jobs => {
			this.setState({jobs, isFetchingStatus: false});
			this.checkJobStatus();
		}).catch(e => {
			this.setState({isFetchingStatus: false});
			NotificationManager.error(e.message, "Fetch Failed");
		});
	};

	activationHandler = () => {
		if (window.confirm(`Are you sure you want to activate this upgrade?`)) {
			upgradeService.activate(this.state.upgrade.id).then(() => window.location.reload());
		}
	};

	cancelationHandler = () => {
		if (window.confirm(`Are you sure you want to cancel this upgrade?  All ${this.state.items.length} request(s) will be cancelled.`)) {
			upgradeService.cancel(this.state.upgrade.id).then(() => window.location.reload());
		}
	};

	selectionHandler = (selected) => {
		this.setState({selected});
		console.log(JSON.stringify(selected));
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
				disabled: this.state.upgrade.status === "Closed" || !userCanActivate,
				detail: "Update items in this upgrade to Pending state"
			},
			{
				label: "Cancel Upgrade", handler: this.cancelationHandler.bind(this),
				disabled: this.state.upgrade.status === "Closed"
			}
		];

		let count = this.state.items.length, completed = 0, errors = 0;
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
					<Tabs id="OrgGroupView">
						<div label="Requests">
							<UpgradeItemCard upgrade={this.state.upgrade} notes={itemNotes}
											 onSelect={this.selectionHandler} items={this.state.items}
											 status={this.state.upgrade.status}/>
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