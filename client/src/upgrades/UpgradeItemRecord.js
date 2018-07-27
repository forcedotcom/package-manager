import React from 'react';

import * as upgradeItemService from '../services/UpgradeItemService';

import {HeaderField, HeaderNote, RecordHeader} from '../components/PageHeader';
import * as sortage from "../services/sortage";
import * as upgradeJobService from "../services/UpgradeJobService";
import {isDoneStatus, Status, UPGRADE_ITEM_ICON} from "../Constants";
import moment from "moment";
import UpgradeJobCard from "./UpgradeJobCard";
import ProgressBar from "../components/ProgressBar";
import {NotificationManager} from "react-notifications";
import * as notifier from "../services/notifications";

export default class extends React.Component {
	SORTAGE_KEY_JOBS = "UpgradeJobCard";

	state = {
		item: {},
		sortOrderJobs: sortage.getSortOrder(this.SORTAGE_KEY_JOBS, "id", "asc"),
		active: false,
		jobs: []
	};

	componentDidMount() {
		notifier.on('upgrade-items', this.upgradeItemsUpdated);
		notifier.on('upgrade-jobs', this.upgradeJobsUpdated);
		upgradeItemService.requestById(this.props.match.params.itemId).then(item => {
			this.loadItemJobs(item);
		});
	};

	componentWillUnmount() {
		notifier.remove('upgrade-items', this.upgradeItemsUpdated);
		notifier.remove('upgrade-jobs', this.upgradeJobsUpdated);
	}

	upgradeItemsUpdated = (items) => {
		const mine = items.filter(i => i.id === this.state.item.id);
		if (mine.length > 0) {
			this.setState({item: items[0]});
		}
	};

	upgradeJobsUpdated = (jobs) => {
		const mine = jobs.filter(j => j.item_id === this.state.item.id);
		if (mine.length > 0) {
			// At least one of these is from our item, so just reload all of them
			upgradeItemService.requestById(this.props.match.params.itemId).then(item => {
				this.loadItemJobs(item);
			});
		}
	};
	
	loadItemJobs(item) {
		upgradeJobService.requestAllJobs(item.id, this.state.sortOrderJobs).then(jobs => {
			this.setState({item, jobs, isCanceling: false, isActivating: false});
		});
	}

	handleActivation = () => {
		if (window.confirm(`Are you sure you want to activate this request for ${moment(this.state.item.start_time).format("lll")}?`)) {
			this.setState({isActivating: true});
			upgradeItemService.activate(this.state.item.id).then(item => this.loadItemJobs(item))
			.catch(e => {
				this.setState({isActivating: true});
				NotificationManager.error(e.message, "Activation Failed");
			});
		}
	};

	handleCancellation = () => {
		if (window.confirm(`Are you sure you want to cancel this request?  All ${this.state.jobs.length} orgs will be cancelled.`)) {
			this.setState({isCancelling: true});
			upgradeItemService.cancel(this.state.item.id).then(item => this.loadItemJobs(item))
			.catch(e => {
				this.setState({isCancelling: true});
				NotificationManager.error(e.message, "Cancellation Failed");
			});
		}
	};

	render() {
		let canActivate = true;
		let user = JSON.parse(sessionStorage.getItem("user"));
		if (user) {
			canActivate = user.enforce_activation_policy === "false" || (this.state.item.created_by != null && this.state.item.created_by !== user.username);
		}
		const notes = [];
		if (!canActivate) {
			notes.push(<HeaderNote key="activation_warning">Activation is disabled. The same user that scheduled an
				upgrade cannot activate it.</HeaderNote>)
		} else if (!user || user.enforce_activation_policy === "false") {
			notes.push(<HeaderNote key="activation_warning">Activation policy enforcement is disabled for testing
				purposes. THIS IS NOT ALLOWED IN PRODUCTION.</HeaderNote>)
		}

		let actions = [
			{
				label: "Activate Request",
				handler: this.handleActivation,
				spinning: this.state.isActivating,
				disabled: this.state.item.status !== Status.Created || !canActivate,
				detail: canActivate ? "Update the selected items to Pending state to proceed with upgrades" : "The same user that scheduled an upgrade cannot activate it"
			},
			{
				label: "Cancel Request",
				handler: this.handleCancellation,
				spinning: this.state.isCancelling,
				disabled: [Status.Created, Status.Pending].indexOf(this.state.item.status) === -1
			}
		];

		let count = this.state.jobs.length, completed = 0, errors = 0;
		for (let i = 0; i < count; i++) {
			let job = this.state.jobs[i];
			if (isDoneStatus(job.status)) {
				completed++;
			}
			if (job.status === Status.Failed) {
				errors++;
			}
		}
		return (
			<div>
				<RecordHeader type="Upgrade Request" icon={UPGRADE_ITEM_ICON} title={this.state.item.description}
							  actions={actions} notes={notes}>
					<HeaderField label="Start Time" format="datetime" value={this.state.item.start_time}/>
					<HeaderField label="Status" value={this.state.item.status}
								 className={this.state.item.status === "Done" ? "" : "slds-text-color_success"}/>
					<HeaderField label="Created By" value={this.state.item.created_by}/>
				</RecordHeader>
				<ProgressBar progress={completed / count} success={errors === 0}/>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<UpgradeJobCard jobs={this.state.jobs}/>
				</div>
			</div>
		);
	}
}