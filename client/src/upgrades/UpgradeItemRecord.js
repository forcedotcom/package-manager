import React from 'react';

import * as upgradeItemService from '../services/UpgradeItemService';
import * as upgradeJobService from "../services/UpgradeJobService";
import * as authService from "../services/AuthService";

import {HeaderField, RecordHeader} from '../components/PageHeader';
import {getProgress, Messages, Status, UPGRADE_ITEM_ICON} from "../Constants";
import moment from "moment";
import UpgradeJobCard from "./UpgradeJobCard";
import ProgressBar from "../components/ProgressBar";
import * as notifier from "../services/notifications";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {
			user: authService.getSessionUser(this),
			item: {},
			progress: getProgress([])
		};
		
		this.upgradeItemsUpdated = this.upgradeItemsUpdated.bind(this);
		this.fetchJobs = this.fetchJobs.bind(this);
		this.fetchItemJobs = this.fetchItemJobs.bind(this);
		this.upgradeItemsUpdated = this.upgradeItemsUpdated.bind(this);
		this.handleActivation = this.handleActivation.bind(this);
		this.handleCancellation = this.handleCancellation.bind(this);
		this.refreshJobsHandler = this.refreshJobsHandler.bind(this);
		this.refreshJobsCompleteHandler = this.refreshJobsCompleteHandler.bind(this);
	}

	// Lifecycle
	componentDidMount() {
		notifier.on('upgrade-items', this.upgradeItemsUpdated);
		notifier.on('upgrade-jobs', this.refreshJobsCompleteHandler);

		upgradeItemService.requestById(this.props.match.params.itemId).then(item => this.setState({item}));
	}

	componentWillUnmount() {
		notifier.remove('upgrade-items', this.upgradeItemsUpdated);
		notifier.remove('upgrade-jobs', this.refreshJobsCompleteHandler);
	}
	
	render() {
		const {item, progress, user} = this.state;
		let userCanActivate = user.enforce_activation_policy === "false" || (item.created_by != null && item.created_by !== user.username);

		let actions = [
			{
				label: "Activate Request", handler: this.handleActivation,
				disabled: user.read_only || !userCanActivate || item.status !== Status.Created,
				detail: !userCanActivate ? Messages.SAME_USER_ACTIVATE :
					user.read_only ? Messages.READ_ONLY_USER : Messages.ACTIVATE_UPGRADE_ITEMS,
				spinning: this.state.isActivating
			},
			{
				label: "Cancel Request", handler: this.handleCancellation,
				disabled: user.read_only || progress.canceled > 0 || progress.done,
				detail: user.read_only ? Messages.READ_ONLY_USER : progress.canceled > 0 || progress.done ? Messages.NOTHING_TO_DO : "",
				spinning: this.state.isCancelling
			},
			{
				label: "Refresh Request", handler: this.refreshJobsHandler,
				disabled: user.read_only,
				detail: user.read_only ? Messages.READ_ONLY_USER : "",
				spinning: this.state.isRefreshing
			}
		];
		
		return (
			<div>
				<RecordHeader type="Upgrade Request" icon={UPGRADE_ITEM_ICON} title={item.description}
							  actions={actions} parent={{label: "Upgrade", location: `/upgrade/${item.upgrade_id}`}}>
					<HeaderField label="Scheduled Start" value={`${moment(item.scheduled_start_time).format('lll')} (${moment(item.scheduled_start_time).fromNow()})`}/>
					<HeaderField label="Status" value={item.status}
								 className={item.status === "Done" ? "" : "slds-text-color_success"}/>
					<HeaderField label="Created By" value={item.created_by}/>
					<HeaderField label="Activated By" value={item.activated_by || ''}/>
					<HeaderField label="Activated On" value={`${item.activated_date ?
						moment(item.activated_date).format('lll') : ''}`}/>
					<HeaderField label="Start Time" value={`${item.start_time ? moment(item.start_time).format('lll') : ''}`}/>
					<HeaderField label="End Time" value={`${item.end_time ? moment(item.end_time).format('lll') : ''}`}/>
				</RecordHeader>
				<ProgressBar progressSuccess={progress.percentageSuccess} progressWarning={progress.percentageCanceled} 
							 progressError={progress.percentageError}/>
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

	fetchItemJobs(item) {
		upgradeJobService.requestAllJobs(this.props.match.params.itemId).then(jobs => {
			this.setState({item, jobs, isCancelling: false, isActivating: false});
		});
	}

	upgradeItemsUpdated(items) {
		const mine = items.find(i => (i.id || i) === this.state.item.id);
		if (mine) {
			this.setState({item: items[0]});
		}
	}

	handleActivation() {
		if (window.confirm(`Are you sure you want to activate this request for ${moment(this.state.item.scheduled_start_time).format("lll")}?`)) {
			this.setState({isActivating: true});
			upgradeItemService.activate(this.state.item.id).then(item => this.fetchItemJobs(item))
			.catch(e => {
				this.setState({isActivating: false});
				notifier.error(e.message, "Activation Failed");
			});
		}
	}

	handleCancellation() {
		if (window.confirm(`Are you sure you want to cancel this request?  All ${this.state.item.eligible_job_count} orgs will be canceled.`)) {
			this.setState({isCancelling: true});
			upgradeItemService.cancel(this.state.item.id)
			.then(item => this.fetchItemJobs(item))
			.catch(e => {
				this.setState({isCancelling: false});
				notifier.error(e.message, "Cancellation Failed");
			});
		}
	}

	refreshJobsHandler() {
		if (window.confirm(`Are you sure you want to refresh this upgrade request?  This will take some time and run in the background.`)) {
			this.setState({isRefreshing: true});
			upgradeItemService.refresh(this.state.item.id).then(() =>
				notifier.info("Refreshing upgrade request information from packaging org", "Refreshing Upgrade Request"))
				.catch((e) => {
					this.setState({isRefreshing: false});
					notifier.error(e.message, "Refresh Failed");
				});
		}
	}

	refreshJobsCompleteHandler(data) {
		if (data === String(this.state.item.id)) {
			this.setState({isRefreshing: false});
		}
	}
}
