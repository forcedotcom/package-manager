import React from 'react';

import * as upgradeService from '../services/UpgradeService';

import {HeaderField, HeaderNote, RecordHeader} from '../components/PageHeader';
import * as upgradeItemService from "../services/UpgradeItemService";
import * as upgradeJobService from "../services/UpgradeJobService";
import * as sortage from "../services/sortage";
import {isDoneStatus, isStartedStatus, Status, UPGRADE_ICON} from "../Constants";
import UpgradeItemCard from "./UpgradeItemCard";
import ProgressBar from "../components/ProgressBar";
import UpgradeJobCard from "./UpgradeJobCard";
import Tabs from "../components/Tabs";
import {NotificationManager} from "react-notifications";
import moment from "moment";
import * as notifier from "../services/notifications";
import {DataTableFilterHelp} from "../components/DataTableFilter";

export default class extends React.Component {
	SORTAGE_KEY_ITEMS = "UpgradeItemCard";
	SORTAGE_KEY_JOBS = "UpgradeRecord.UpgradeJobCard";

	state = {
		upgrade: {},
		items: [],
		jobs: [],
		sortOrderItems: sortage.getSortOrder(this.SORTAGE_KEY_ITEMS, "p.dependency_tier", "asc"),
		sortOrderJobs: sortage.getSortOrder(this.SORTAGE_KEY_JOBS, "id", "asc")
	};

	componentDidMount() {
		notifier.on('upgrade', this.upgradeUpdated);
		notifier.on('upgrade-items', this.upgradeItemsUpdated);
		notifier.on('upgrade-jobs', this.upgradeJobsUpdated);

		Promise.all([upgradeService.requestById(this.props.match.params.upgradeId),
			upgradeItemService.findByUpgrade(this.props.match.params.upgradeId, this.state.sortOrderItems),
			upgradeJobService.requestAllJobsInUpgrade(this.props.match.params.upgradeId, this.state.sortOrderJobs)])
		.then(results => this.setState({upgrade: results[0], items: results[1], jobs: results[2]}));
	}

	componentWillUnmount() {
		notifier.remove('upgrade', this.upgradeUpdated);
		notifier.remove('upgrade-items', this.upgradeItemsUpdated);
		notifier.remove('upgrade-jobs', this.upgradeJobsUpdated);
	}

	upgradeUpdated = (upgrade) => {
		if (upgrade && this.state.upgrade.id === upgrade.id) {
			this.setState({upgrade});
		}
	};
	
	upgradeItemsUpdated = (items) => {
		if (!items || !items.filter)
			return;
		
		const mine = items.find(i => i.upgrade_id === this.state.upgrade.id);
		if (mine) {
			// At least one of these is from our upgrade, so just reload all of them
			upgradeItemService.findByUpgrade(this.props.match.params.upgradeId, this.state.sortOrderItems).then(items => {
				this.setState({items});
			});
		}
	};
	
	upgradeJobsUpdated = (jobs) => {
		if (!jobs || !jobs.filter)
			return;
		
		const mine = jobs.find(j => j.upgrade_id === this.state.upgrade.id);
		if (mine) {
			// At least one of these is from our upgrade, so just reload all of them
			upgradeJobService.requestAllJobsInUpgrade(this.props.match.params.upgradeId, this.state.sortOrderJobs).then(jobs => {
				this.setState({jobs});
			});
		}
	};
	
	activationHandler = () => {
		if (window.confirm(`Are you sure you want to activate this upgrade?`)) {
			this.setState({isActivating: true});
			upgradeService.activate(this.state.upgrade.id).then(() => window.location.reload()).catch((e) => {
				this.setState({isActivating: false});
				NotificationManager.error(e.message, "Activation Failed");
			});
		}
	};

	cancellationHandler = () => {
		if (window.confirm(`Are you sure you want to cancel this upgrade?  All ${this.state.items.length} request(s) will be cancelled.`)) {
			this.setState({isCancelling: true});
			upgradeService.cancel(this.state.upgrade.id).then(() => window.location.reload()).catch((e) => {
				this.setState({isCancelling: false});
				NotificationManager.error(e.message, "Cancellation Failed");
			});
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
		const {upgrade,items,jobs} = this.state;
		
		let userCanActivate = true;
		let user = JSON.parse(sessionStorage.getItem("user"));
		if (user) {
			userCanActivate = user.enforce_activation_policy === "false" || (upgrade.created_by != null && upgrade.created_by !== user.username);
		}

		const itemNotes = [];
		if (!userCanActivate) {
			itemNotes.push(<HeaderNote key="activation_warning">Activation is disabled. The same user that scheduled an
				upgrade cannot activate it.</HeaderNote>)
		} else if (!user || user.enforce_activation_policy === "false") {
			itemNotes.push(<HeaderNote key="activation_warning">Activation policy enforcement is disabled for testing
				purposes. THIS IS NOT ALLOWED IN PRODUCTION.</HeaderNote>)
		}

		let count = this.state.jobs.length, started = 0, completed = 0, errors = 0, cancelled = 0;
		for (let i = 0; i < this.state.jobs.length; i++) {
			let job = this.state.jobs[i];
			if (job.status === Status.Ineligible) {
				count--;
			}
			if (isStartedStatus(job.status)) {
				started++;
			}
			if (isDoneStatus(job.status)) {
				completed++;
			}
			if (job.status === Status.Failed) {
				errors++;
			}
			if (job.status === Status.Canceled) {
				cancelled++;
			}
		}
		const progress = (started+completed)/(count*2);
		const done = progress === 1 || count === 0;
		
		const actions = [
			{
				label: "Activate Upgrade", handler: this.activationHandler.bind(this),
				disabled: !userCanActivate || started > 0 || done,
				detail: userCanActivate ? "Activate all items to proceed with upgrade" : "The same user that scheduled an upgrade cannot activate it",
				spinning: this.state.isActivating
			},
			{
				label: "Cancel Upgrade", handler: this.cancellationHandler.bind(this),
				disabled: started > 0 || done,
				spinning: this.state.isCancelling
			},
			{
				label: "Retry Upgrade", handler: this.retryHandler.bind(this),
				disabled: !done || errors === 0, 
				spinning: this.state.isRetrying
			}
		];

		return (
			<div>
				<RecordHeader type="Upgrade" icon={UPGRADE_ICON} title={upgrade.description} actions={actions}>
					<HeaderField label="Scheduled Start Time" value={`${moment(upgrade.start_time).format('lll')} (${moment(upgrade.start_time).fromNow()})`}/>
					<HeaderField label="Status" value={upgrade.status}/>
					<HeaderField label="Created By" value={upgrade.created_by}/>
				</RecordHeader>
				<ProgressBar progress={progress} success={errors === 0 && cancelled === 0}/>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<Tabs id="UpgradeRecord">
						<div label="Requests">
							<UpgradeItemCard upgrade={upgrade} notes={itemNotes} items={items}/>
						</div>
						<div label="Jobs">
							<UpgradeJobCard jobs={jobs}/>
						</div>
					</Tabs>
					<DataTableFilterHelp/>
				</div>
			</div>
		);
	}
}