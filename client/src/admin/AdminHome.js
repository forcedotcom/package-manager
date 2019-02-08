import React from 'react';
import moment from "moment";
import debounce from 'lodash.debounce';

import * as notifier from "../services/notifications";
import * as adminService from '../services/AdminService';

import {ADMIN_ICON, Colors} from "../Constants";
import ProgressBar from "../components/ProgressBar";
import Tabs from "../components/Tabs";
import {RecordHeader} from "../components/PageHeader";
import {Helmet} from "react-helmet";
import * as authService from "../services/AuthService";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			jobs: [],
			queue: [],
			history: {latest: [], all: []},
			settings: {},
			isMini: window.innerWidth < 1000
		};
		
		this.onJobs = this.onJobs.bind(this);
		this.onHistory = this.onHistory.bind(this);
		this.onQueue = this.onQueue.bind(this);
		this.cancellationHandler = this.cancellationHandler.bind(this);
		this.fetchHandler = this.fetchHandler.bind(this);
		this.refetchInvalidHandler = this.refetchInvalidHandler.bind(this);
		this.refetchAllHandler = this.refetchAllHandler.bind(this);
		this.uploadOrgsHandler = this.uploadOrgsHandler.bind(this);
		this.goToHerokuHandler = this.goToHerokuHandler.bind(this);
		this.showAllHistoryHandler = this.showAllHistoryHandler.bind(this);
	}

	// Lifecycle	
	componentDidMount() {
		window.addEventListener('resize', this.handleWindowResize);

		notifier.on('jobs', this.onJobs);
		notifier.on('job-history', this.onHistory);
		notifier.on('job-queue', this.onQueue);

		adminService.requestSettings().then(settings => {
			adminService.requestJobs().then(res => {
				this.setState({settings, jobs: res.jobs, queue: res.queue, history: res.history})
			});
		});
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.handleWindowResize);
		
		notifier.remove('jobs', this.onJobs);
		notifier.remove('job-history', this.onHistory);
		notifier.remove('job-queue', this.onQueue);
	}

	render() {
		let activeCards = [];
		if (this.state.jobs.length > 0) {
			for (let i = 0; i < this.state.jobs.length; i++) {
				let job = this.state.jobs[i];
				let actions = [];
				if (job.stepIndex !== job.stepCount && !job.canceled) {
					actions.push({
						label: "Cancel Job",
						handler: () => this.cancellationHandler(job),
						spinning: job.cancelling
					});
				}
				activeCards.push(
					<AdminCard key={job.id} title={job.name} status={job.status} actions={actions}>
						<ProgressBar message={job.message} progress={job.stepIndex / job.stepCount}
									 status={job.errors.length > 0 ? "error" : "success"}/>
						{job.errors.length > 0 ?
							<Section title="Errors"><Errors startTime={job.startTime} lines={job.errors}/></Section> : ""}
						{job.results.length > 0 ?
							<Section closed="true" title="Results"><Results startTime={job.startTime} lines={job.results}/></Section> : ""}
					</AdminCard>);
			}
		} else {
			activeCards.push(
				<div key="no-active" className="slds-text-body_regular slds-m-left--medium slds-text-color--weak">No
					active jobs</div>
			);
		}

		let queueCards = [];
		if (this.state.queue.length > 0) {
			for (let i = 0; i < this.state.queue.length; i++) {
				let job = this.state.queue[i];
				queueCards.push(
					<AdminCard key={`${job.id}-queue-${i}`} title={job.name} actions={[
						{label: "Cancel Job", handler: () => this.cancellationHandler(job), spinning: job.cancelling}]}>
					</AdminCard>);
			}
		} else {
			queueCards.push(
				<div key="no-queue" className="slds-text-body_regular slds-m-left--medium slds-text-color--weak">No
					queued jobs</div>
			);
		}

		let latestHistoryCards = [];
		if (this.state.history.latest.length > 0) {
			for (let i = this.state.history.latest.length - 1; i >= 0; i--) {
				let job = this.state.history.latest[i];
				latestHistoryCards.push(
					<AdminCard key={`${job.id}-history-${i}`} title={job.name}>
						<div className="slds-m-top--medium slds-m-bottom--medium">
							<ProgressBar message={`${moment(job.modifiedDate).format("lll")} (completed in ${moment.duration(Math.ceil(moment(job.modifiedDate).diff(job.startTime) / 1000), 's').asSeconds()} s)`} progress={1}
										 status={job.errors.length > 0 ? "error" : "success"}/></div>
						{job.errors.length > 0 ?
							<Section title="Errors"><Errors startTime={job.startTime} lines={job.errors}/></Section> : ""}
						{job.results.length > 0 ?
							<Section closed="true" title="Results"><Results startTime={job.startTime} lines={job.results}/></Section> : ""}
					</AdminCard>);
			}
		} else {
			latestHistoryCards.push(
				<div key="no-history" className="slds-text-body_regular slds-m-around--x-small slds-text-color--weak">No
					job history</div>
			);
		}
		
		let historyCards = [];
		if (this.state.history.all.length > 0) {
			for (let i = this.state.history.all.length - 1; i >= 0; i--) {
				let job = this.state.history.all[i];
				historyCards.push(
					<TimelineEntry key={`${job.id}-history-${i}`} subject={job.name} interval={job.interval}
								   error={job.errors.length > 0} timestamp={`${moment(job.modifiedDate).format("lll")} (completed in ${moment.duration(Math.ceil(moment(job.modifiedDate).diff(job.startTime) / 1000), 's').asSeconds()} s)`}>
						{job.errors.length > 0 ?
							<Section title="Errors"><Errors startTime={job.startTime} lines={job.errors}/></Section> : ""}
						{job.results.length > 0 ?
							<Section closed="true" title="Results"><Results startTime={job.startTime} lines={job.results}/></Section> : ""}
					</TimelineEntry>);
			}
		} else {
			historyCards.push(
				<div key="no-history" className="slds-text-body_regular slds-m-around--x-small slds-text-color--weak">No
					job history</div>
			);
		}

		let actions = [
			{label: "Fetch Latest", handler: this.fetchHandler},
			{label: "Fetch Invalid Orgs", handler: this.refetchInvalidHandler},
			{label: "Re-Fetch All", handler: this.refetchAllHandler},
		];

		let user = authService.getSessionUser();
		if (user && user.enable_sumo)
			actions.push({label: "Upload Orgs To SumoLogic", group: "external", handler: this.uploadOrgsHandler});

		if (this.state.settings.HEROKU_APP_NAME) {
			actions.push({label: "Open Heroku", handler: this.goToHerokuHandler, group: "external"});
		}

		return (
			<div>
				<Helmet>
					<title>SteelBrick PM: Admin</title>
				</Helmet>
				<RecordHeader type="Admin" icon={ADMIN_ICON} title="Background Jobs" actions={actions}/>

				{this.state.isMini ?
					<div className="slds-grid slds-gutters">
						<div className="slds-col slds-size_1-of-1">
							<Tabs id="Content">
								<div label={`Active Jobs (${this.state.jobs.length})`}>
									{activeCards}
								</div>
								<div label={`Queue (${this.state.queue.length})`}>
									{queueCards}
								</div>
								<div label={`Recent Jobs (${this.state.history.latest.length})`}>
									{latestHistoryCards}
								</div>
								<div label={`All History (${this.state.history.all.length})`}>
									{historyCards}
								</div>
							</Tabs>
						</div>
					</div>
					:
					<div className="slds-grid slds-gutters">
						<div className="slds-col slds-size_3-of-5">
							<Tabs id="Content">
								<div label={`Active Jobs (${this.state.jobs.length})`}>
									{activeCards}
								</div>
								<div label={`Queue (${this.state.queue.length})`}>
									{queueCards}
								</div>
							</Tabs>
						</div>
						<div className="slds-col slds-size_2-of-5">
							<Tabs id="Content">
								<div label={`Recent Jobs (${this.state.history.latest.length})`}>
									{latestHistoryCards}
								</div>
								<div label={`History (${this.state.history.all.length})`}>
									{historyCards}
								</div>
							</Tabs>
						</div>
					</div>
				}
			</div>
		);
	}

	//  Handlers
	handleWindowResize = debounce(() => {
		this.setState({isMini: window.innerWidth < 1000})
	}, 200);

	onJobs(data) {
		this.setState({jobs: data || []});
	}

	onHistory(data) {
		this.setState({history: data || []});
	}

	onQueue(data) {
		this.setState({queue: data || []});
	}

	cancellationHandler(job) {
		job.cancelling = true;
		adminService.requestCancel([job.id]).then(res => this.setState({
			jobs: res.jobs,
			queue: res.queue,
			history: res.history
		}));
	}

	fetchHandler() {
		notifier.emit("fetch", {});
	}

	refetchInvalidHandler() {
		notifier.emit("fetch-invalid", {});
	}

	refetchAllHandler() {
		notifier.emit("fetch-all", {});
	}

	uploadOrgsHandler() {
		notifier.emit("upload-orgs", {});
	}

	goToHerokuHandler() {
		window.open(`https://dashboard.heroku.com/apps/${encodeURI(this.state.settings.HEROKU_APP_NAME)}`);
	}

	showAllHistoryHandler = () => {
		this.setState({showAllHistory: true});
	};
}

class Section extends React.Component {
	state = {isopen: this.props.closed ? "" : "slds-is-open"};
	toggleExpando = () => {
		this.setState(prevState => ({isopen: prevState.isopen === "" ? "slds-is-open" : ""}));
	};

	render() {
		return (
			<div className={`slds-section ${this.state.isopen}`}>
				<h3>
					<button className="slds-button slds-section__title-action" onClick={this.toggleExpando}>
						<svg
							className="slds-section__title-action-icon slds-button__icon--small slds-button__icon_left"
							aria-hidden="true">
							<use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#switch"
								 xmlnsXlink="http://www.w3.org/1999/xlink"/>
						</svg>
						<span className="slds-truncate" title={this.props.title}>{this.props.title}</span>
					</button>
				</h3>
				<div className="slds-section__content">
					{this.props.children}
				</div>
			</div>
		);
	}
}

class Results extends React.Component {
	render() {
		let startTime = this.props.startTime;
		let lines = this.props.lines.map((r, i) =>
			<li key={i} className="slds-item">
				{r.message}
				<span style={{float: "right", color: Colors.Subtle, padding: "0 20px 0 20px"}}>{i === 0 ? "mm:ss" : moment(Math.abs(r.timestamp-startTime)).format("mm:ss")}</span>
				{r.details ? r.details.map((m, i) => <div key={i} style={{color: Colors.Subtle, marginLeft: "1.25em"}}>{m}</div>) : ""}
			</li>);
		return (
			<ul className="checklist">{lines}</ul>
		);
	}
}

class Errors extends React.Component {
	render() {
		let lines = this.props.lines.map((r, i) => <li key={i} className="slds-item">{r.message}</li>);
		return (
			<ul className="checklist errorlist">{lines}</ul>
		);
	}
}

class TimelineEntry extends React.Component {
	state = {type: this.props.type || "task", isopen: ""};
	toggleExpando = () => {
		this.setState(prevState => ({isopen: prevState.isopen === "" ? "slds-is-open" : ""}));
	};

	render() {
		let interval = "", error = "";
		if (this.props.interval) {
			interval =
				<div className="slds-no-flex">
                    <span className="slds-icon_container slds-icon-utility-rotate"
						  title={`Recurring every ${moment.duration(this.props.interval).humanize()}`}>
                      <svg className="slds-icon slds-icon_xx-small slds-icon-text-default slds-m-left_x-small">
                        <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#rotate"
							 xmlnsXlink="http://www.w3.org/1999/xlink"/>
                      </svg>
                    </span>
				</div>
		}
		if (this.props.error) {
			error =
				<div className="slds-no-flex">
                    <span className="slds-icon_container slds-icon-utility-error" title="One or more errors occurred">
                      <svg
						  className="slds-icon slds-icon_xx-small slds-icon-text-default slds-m-left_x-small slds-icon-text-error">
                        <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#error"
							 xmlnsXlink="http://www.w3.org/1999/xlink"/>
                      </svg>
                    </span>
				</div>
		}

		return (
				<div
					className={`slds-timeline__item_expandable slds-timeline__item_${this.state.type} ${this.state.isopen}`}>
					<span className="slds-assistive-text">{this.state.type}</span>
					<div className="slds-media">
						<div className="slds-media__figure">
							<button className="slds-button slds-button_icon" onClick={this.toggleExpando}>
								<svg className="slds-button__icon slds-timeline__details-action-icon"
									 aria-hidden="true">
									<use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#switch"
										 xmlnsXlink="http://www.w3.org/1999/xlink"/>
								</svg>
							</button>
							<div
								className={`slds-icon_container slds-icon-standard-${this.state.type} slds-timeline__icon`}
								title={this.state.type}>
								<svg className="slds-icon slds-icon_small" aria-hidden="true">
									<use xlinkHref={`/assets/icons/standard-sprite/svg/symbols.svg#${this.state.type}`}
										 xmlnsXlink="http://www.w3.org/1999/xlink"/>
								</svg>
							</div>
						</div>
						<div className="slds-media__body">
							<div className="slds-grid slds-grid_align-spread slds-timeline__trigger">
								<div
									className="slds-grid slds-grid_vertical-align-center slds-truncate_container_75 slds-no-space">
									<h3 className="slds-truncate" title={this.props.subject}>
										<a>
											<strong>{this.props.subject}</strong>
										</a>
									</h3>
									{interval}
									{error}
								</div>
								<div className="slds-timeline__actions slds-timeline__actions_inline">
									<p className="slds-timeline__date">{this.props.timestamp}</p>
								</div>
							</div>
							{this.props.children}
						</div>
					</div>
				</div>
		);
	}
}

class AdminCard extends React.Component {
	render() {
		let actions = this.props.actions ? this.props.actions : [];
		let groups = [];
		let currentGroup = null;
		for (let i = 0; i < actions.length; i++) {
			const currentAction = actions[i];
			let btn =
				<button key={currentAction.label} disabled={currentAction.disabled || currentAction.spinning}
						className="slds-button slds-button--neutral" onClick={currentAction.handler}>
					{currentAction.spinning ?
						<div style={{width: "3em"}}>&nbsp;
							<div role="status" className="slds-spinner slds-spinner_x-small">
								<div className="slds-spinner__dot-a"/>
								<div className="slds-spinner__dot-b"/>
							</div>
						</div> : currentAction.label}
				</button>;
			if (currentAction.spinning || currentGroup == null || currentGroup.key !== currentAction.group) {
				currentGroup = {key: currentAction.group, actions: [btn]};
				groups.push(currentGroup);
			} else {
				currentGroup.actions.push(btn);
			}
		}

		let actionBar = [];
		for (let i = 0; i < groups.length; i++) {
			actionBar.push(<div key={i} className="slds-button-group" role="group">{groups[i].actions}</div>);
		}

		return (
			<article className="slds-card">
				<div className="slds-card__header slds-grid">
					<header className="slds-media slds-media_center slds-has-flexi-truncate">
						<div className="slds-media__figure">
                            <span className="slds-icon_container slds-icon-standard-bot">
                              <svg className="slds-icon slds-icon_small" aria-hidden="true">
                                <use xlinkHref="/assets/icons/standard-sprite/svg/symbols.svg#bot"
									 xmlnsXlink="http://www.w3.org/1999/xlink"/>
                              </svg>
                            </span>
						</div>
						<div className="slds-media__body">
							<span className="slds-text-heading_small">{this.props.title}</span>
							{this.props.status === "Complete" ?
								<span style={{borderRadius: "4px", padding: "0 4px 0 4px"}}
									  className="slds-float--right slds-theme--success slds-text-color_inverse">{this.props.status}</span> :
								<span style={{borderRadius: "4px", padding: "0 4px 0 4px"}}
									  className="slds-float--right slds-theme--error slds-text-color_inverse">{this.props.status}</span>
							}
						</div>
					</header>
					{actionBar}
				</div>
				<div className="slds-card__body slds-card__body_inner">
					{this.props.children}
				</div>
			</article>
		);
	}
}