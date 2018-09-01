import React from 'react';

import * as upgradeItemService from '../services/UpgradeItemService';
import * as upgradeJobService from "../services/UpgradeJobService";

import {HeaderField, RecordHeader} from '../components/PageHeader';
import {getProgress, Status, UPGRADE_ITEM_ICON} from "../Constants";
import moment from "moment";
import UpgradeJobCard from "./UpgradeJobCard";
import ProgressBar from "../components/ProgressBar";
import {NotificationManager} from "react-notifications";
import * as notifier from "../services/notifications";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {item: {},
			progress: getProgress([])
		};
		
		this.upgradeItemsUpdated = this.upgradeItemsUpdated.bind(this);
		this.fetchJobs = this.fetchJobs.bind(this);
		this.upgradeItemsUpdated = this.upgradeItemsUpdated.bind(this);
		this.handleActivation = this.handleActivation.bind(this);
		this.handleCancellation = this.handleCancellation.bind(this);
	}

	// Lifecycle
	componentDidMount() {
		notifier.on('upgrade-items', this.upgradeItemsUpdated);

		upgradeItemService.requestById(this.props.match.params.itemId).then(item => this.setState({item}));
	}
	
	render() {
		const {item, progress} = this.state;
		let userCanActivate = true;
		let user = JSON.parse(sessionStorage.getItem("user"));
		if (user) {
			userCanActivate = user.enforce_activation_policy === "false" || (item.created_by != null && item.created_by !== user.username);
		}

		let actions = [
			{
				label: "Activate Request", handler: this.handleActivation,
				disabled: !userCanActivate || item.status !== Status.Created,
				detail: userCanActivate ? "Update the selected items to proceed with upgrade" : "The same user that scheduled an upgrade cannot activate it",
				spinning: this.state.isActivating
			},
			{
				label: "Cancel Request", handler: this.handleCancellation,
				disabled: progress.canceled > 0 || progress.done,
				spinning: this.state.isCancelling
			}
		];
		
		return (
			<div>
				<RecordHeader type="Upgrade Request" icon={UPGRADE_ITEM_ICON} title={item.description}
							  actions={actions} parent={{label: "Upgrade", location: `/upgrade/${item.upgrade_id}`}}>
					<HeaderField label="Scheduled Start Time" value={`${moment(item.start_time).format('lll')} (${moment(item.start_time).fromNow()})`}/>
					<HeaderField label="Status" value={item.status}
								 className={item.status === "Done" ? "" : "slds-text-color_success"}/>
					<HeaderField label="Created By" value={item.created_by}/>
				</RecordHeader>
				<ProgressBar progress={progress.percentage} status={progress.status}/>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<UpgradeJobCard onFetch={this.fetchJobs} refetchOn="upgrade-jobs"/>
				</div>
			</div>
		);
	}
	
	// Handlers
	fetchJobs() {
		return new Promise((resolve, reject) => {
			upgradeJobService.requestAllJobs(this.props.match.params.itemId).then(jobs => {
				this.setState({progress: getProgress(jobs)});
				resolve(jobs);
			}).catch(reject);
		});
	}

	componentWillUnmount() {
		notifier.remove('upgrade-items', this.upgradeItemsUpdated);
	}

	upgradeItemsUpdated(items) {
		const mine = items.find(i => i.id === this.state.item.id);
		if (mine) {
			this.setState({item: items[0]});
		}
	}

	handleActivation() {
		if (window.confirm(`Are you sure you want to activate this request for ${moment(this.state.item.start_time).format("lll")}?`)) {
			this.setState({isActivating: true});
			upgradeItemService.activate(this.state.item.id).then(item => this.loadItemJobs(item))
			.catch(e => {
				this.setState({isActivating: false});
				NotificationManager.error(e.message, "Activation Failed");
			});
		}
	}

	handleCancellation() {
		if (window.confirm(`Are you sure you want to cancel this request?  All ${this.state.jobs.length} orgs will be canceled.`)) {
			this.setState({isCancelling: true});
			upgradeItemService.cancel(this.state.item.id)
			.then(item => this.loadItemJobs(item))
			.catch(e => {
				this.setState({isCancelling: false});
				NotificationManager.error(e.message, "Cancellation Failed");
			});
		}
	}
}