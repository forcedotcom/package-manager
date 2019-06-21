import React from 'react';

import * as authService from '../services/AuthService';
import * as upgradeService from '../services/UpgradeService';
import * as orgService from '../services/OrgService';

import {HeaderField, RecordHeader} from '../components/PageHeader';
import * as upgradeItemService from "../services/UpgradeItemService";
import * as upgradeJobService from "../services/UpgradeJobService";
import UpgradeItemCard from "./UpgradeItemCard";
import ProgressBar from "../components/ProgressBar";
import UpgradeJobCard from "./UpgradeJobCard";
import Tabs from "../components/Tabs";
import moment from "moment";
import * as notifier from "../services/notifications";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import {getProgress, UPGRADE_ICON} from "../Constants";
import OrgCard from "../orgs/OrgCard";
import * as nav from "../services/nav";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			upgrade: {},
			progress: getProgress([])
		};
		
		this.fetchBlacklist = this.fetchBlacklist.bind(this);
		this.fetchItems = this.fetchItems.bind(this);
		this.fetchJobs = this.fetchJobs.bind(this);
		this.upgradeUpdated = this.upgradeUpdated.bind(this);
		this.activationHandler = this.activationHandler.bind(this);
		this.cancellationHandler = this.cancellationHandler.bind(this);
		this.retryHandler = this.retryHandler.bind(this);
		this.refreshJobsHandler = this.refreshJobsHandler.bind(this);
		this.refreshJobsCompleteHandler = this.refreshJobsCompleteHandler.bind(this);
	}

	componentDidMount() {
		notifier.on('upgrade', this.upgradeUpdated);
		notifier.on('upgrade-jobs', this.refreshJobsCompleteHandler);

		upgradeService.requestById(this.props.match.params.upgradeId)
			.then(upgrade => this.setState({upgrade}))
			.catch(error => notifier.error(error.message, error.subject || "Failed Request", 10000, () => nav.toPath("upgrades")));
	}

	componentWillUnmount() {
		notifier.remove('upgrade', this.upgradeUpdated);
		notifier.remove('upgrade-jobs', this.refreshJobsCompleteHandler);
	}
	
	render() {
		const {upgrade, progress, readOnly} = this.state;
		
		
		let userCanActivate = true;
		let user = authService.getSessionUser();
		if (user) {
			userCanActivate = !readOnly && (user.enforce_activation_policy === "false" || (upgrade.created_by != null && upgrade.created_by !== user.username));
		}
		
		const actions = [
			{
				label: "Activate Upgrade", handler: this.activationHandler,
				disabled: !userCanActivate || progress.active > 0 || progress.done,
				detail: userCanActivate ? "Activate all items to proceed with upgrade" : "The same user that scheduled an upgrade cannot activate it",
				spinning: this.state.isActivating
			},
			{
				label: "Cancel Upgrade", handler: this.cancellationHandler,
				disabled: readOnly || progress.canceled > 0 || progress.done,
				spinning: this.state.isCancelling
			},
			{
				label: "Retry Failed Jobs", handler: this.retryHandler,
				disabled: readOnly || progress.errors === 0,
				spinning: this.state.isRetrying
			},
			{
				label: "Refresh Upgrade", handler: this.refreshJobsHandler,
				spinning: this.state.isRefreshing
			}
		];

		return (
			<div>
				<RecordHeader type="Upgrade" icon={UPGRADE_ICON} title={upgrade.description} actions={actions}
							  parent={{label: "Upgrades", location: `/upgrades`}}>
					<HeaderField label="Scheduled Start Time" value={`${moment(upgrade.start_time).format('lll')} (${moment(upgrade.start_time).fromNow()})`}/>
					<HeaderField label="Upgrade Status" value={upgrade.status}/>
					<HeaderField label="Request Status" value={upgrade.item_status}/>
					<HeaderField label="Created By" value={upgrade.created_by}/>
				</RecordHeader>
				<ProgressBar progressSuccess={progress.percentageSuccess} progressWarning={progress.percentageCanceled}
							 progressError={progress.percentageError}/>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<Tabs id="UpgradeRecord">
						<div label="Requests">
							<UpgradeItemCard onFetch={this.fetchItems} refetchOn="upgrade-items,upgrade-jobs"/>
						</div>
						<div label="Jobs">
							<UpgradeJobCard onFetch={this.fetchJobs} refetchOn="upgrade-jobs"/>
						</div>
						<div label="Blacklist">
							<OrgCard id="UpgradeBlacklistCard" title="Orgs" onFetch={this.fetchBlacklist} refetchOn="upgrade-blacklist"/>
						</div>
					</Tabs>
					<DataTableFilterHelp/>
				</div>
			</div>
		);
	}
	
	// Handlers
	fetchBlacklist() {
		return orgService.requestByUpgradeBlacklist(this.props.match.params.upgradeId);
	};

	fetchItems() {
		return upgradeItemService.findByUpgrade(this.props.match.params.upgradeId);
	};

	fetchJobs() {
		return new Promise((resolve, reject) => {
			upgradeJobService.requestAllJobsInUpgrade(this.props.match.params.upgradeId).then(
				jobs => {
					this.setState({progress: getProgress(jobs)});
					resolve(jobs);
				}).catch(reject);
		});
	}

	upgradeUpdated(upgrade) {
		if (upgrade && this.state.upgrade.id === upgrade.id) {
			this.setState({upgrade});
		}
	}

	activationHandler() {
		if (window.confirm(`Are you sure you want to activate this upgrade?`)) {
			this.setState({isActivating: true});
			upgradeService.activate(this.state.upgrade.id).then(() => window.location.reload()).catch((e) => {
				this.setState({isActivating: false});
				notifier.error(e.message, "Activation Failed");
			});
		}
	}

	cancellationHandler() {
		if (window.confirm(`Are you sure you want to cancel this upgrade?  All requests will be canceled.`)) {
			this.setState({isCancelling: true});
			upgradeService.cancel(this.state.upgrade.id).then(() => window.location.reload()).catch((e) => {
				this.setState({isCancelling: false});
				notifier.error(e.message, "Cancellation Failed");
			});
		}
	}

	retryHandler() {
		if (window.confirm(`Are you sure you want to retry this upgrade?  Only failed jobs will be rescheduled.`)) {
			this.setState({isRetrying: true});
			upgradeService.retry(this.state.upgrade.id).then(upgrade => nav.toPath("upgrade", upgrade.id))
			.catch((e) => {
				this.setState({isRetrying: false});
				notifier.error(e.message, "Retry Failed");
			});
		}
	}

	refreshJobsHandler() {
		if (window.confirm(`Are you sure you want to refresh this upgrade?  This will take some time and run in the background.`)) {
			this.setState({isRefreshing: true});
			upgradeService.refresh(this.state.upgrade.id).then(() =>
				notifier.info("Refreshing upgrade information from packaging orgs", "Refreshing Upgrade"))
					.catch((e) => {
						this.setState({isRefreshing: false});
						notifier.error(e.message, "Refresh Failed");
					});
		}
	}

	refreshJobsCompleteHandler(data) {
		if (data === String(this.state.upgrade.id)) {
			this.setState({isRefreshing: false});
		}
	}
}