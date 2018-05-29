import React from 'react';
import moment from "moment";

import * as adminService from '../services/AdminService';

import {Icon} from "../components/Icons";
import {ADMIN_ICON} from "../Constants";
import * as io from "socket.io-client";
import Tabs from "../components/Tabs";

export default class extends React.Component {
    state = {
        jobs: [],
        queue: [],
        history: [],
        socket: null
    };

    componentDidMount() {
        let socket = io.connect();
        let self = this;
        socket.on('jobs', function (data) {
            self.setState({jobs: data || []});
        });
        socket.on('job-history', function (data) {
            self.setState({history: data || []});
        });
        socket.on('job-queue', function (data) {
            self.setState({queue: data || []});
        });
        
        adminService.requestJobs().then(res => {
            this.setState({socket, jobs: res.jobs, queue: res.queue, history: res.history})
        });
    }

    cancellationHandler = (job) => {
        job.cancelling = true;
        adminService.requestCancel([job.id]).then(res => this.setState({jobs: res.jobs, queue: res.queue, history: res.history}));
    };
    
    fetchHandler = () => {
        this.state.socket.emit("fetch", {});
    };

    refetchInvalidHandler = () => {
        this.state.socket.emit("fetch-invalid", {});
    };
    
    refetchAllHandler = () => {
        this.state.socket.emit("fetch-all", {});
    };
    
    showAllHistoryHandler = () => {
        this.setState({showAllHistory: true});  
    };
    
    render() {
        let activeCards = [];
        if (this.state.jobs.length > 0) {
            for (let i = 0; i < this.state.jobs.length; i++) {
                let job = this.state.jobs[i];
                let actions = [];
                if (job.stepIndex !== job.stepCount && !job.cancelled) {
                    actions.push({label: "Cancel Job", handler: () => this.cancellationHandler(job), spinning: job.cancelling});
                }
                activeCards.push(
                    <AdminCard key={job.id} title={job.name} status={job.status} actions={actions}>
                        <ProgressBar message={job.message} progress={job.stepIndex / job.stepCount} success={job.errors.length === 0}/>
                        {job.errors.length > 0 ?
                            <Section title="Errors"><Results lines={job.errors} divider="slds-has-dividers_bottom-space"/></Section> : "" }
                        {job.messages.length > 0 ?
                            <Section closed="true" title="Results"><Results lines={job.messages}/></Section> : "" }
                    </AdminCard>);
            }
        } else {
            activeCards.push(
                <div key="no-active" className="slds-text-body_regular slds-m-left--medium slds-text-color--weak">No active jobs</div>
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
                <div key="no-queue" className="slds-text-body_regular slds-m-left--medium slds-text-color--weak">No queued jobs</div>
            );
        }



        let historyCards = [];
        let historyCount = this.state.showAllHistory ? this.state.history.length : 10;
        if (this.state.history.length > 0) {
            for (let i = 0; i < Math.min(this.state.history.length, historyCount); i++) {
                let job = this.state.history[i];
                historyCards.push(
                    <TimelineEntry key={`${job.id}-history-${i}`} subject={job.name} interval={job.interval} timestamp={moment(job.modifiedDate).format("lll")}>
                            {job.errors.length > 0 ?
                                <Section title="Errors"><Results lines={job.errors} divider="slds-has-dividers_bottom-space"/></Section> : "" }
                            {job.messages.length > 0 ?
                                <Section closed="true" title="Results"><Results lines={job.messages}/></Section> : "" }
                    </TimelineEntry>);
            }
        } else {
            historyCards.push(
                <div key="no-history" className="slds-text-body_regular slds-m-around--x-small slds-text-color--weak">No job history</div>
            );
        }
        if (!this.state.showAllHistory && this.state.history.length > historyCount) {
            historyCards.push(<a key="no-history" className="slds-text-link slds-m-around--small" onClick={this.showAllHistoryHandler}>Show all ({this.state.history.length})</a> );
        }
        
        return (
            <div>
                <AdminHeader type="Admin" icon={ADMIN_ICON} title="Administration" onUpgrade={this.openSchedulerWindow}>
                    <button className="slds-button slds-button--neutral" onClick={this.fetchHandler}>Fetch Latest</button>
                    <button className="slds-button slds-button--neutral" onClick={this.refetchInvalidHandler}>Fetch Invalid Orgs</button>
                    <button className="slds-button slds-button--neutral" onClick={this.refetchAllHandler}>Re-Fetch All</button>
                </AdminHeader>
                
                <div className="slds-grid slds-gutters">
                    <div className="slds-col slds-size_2-of-3">
                        <Tabs id="Content">
                            <div label={`Active Jobs (${this.state.jobs.length})`}>
                                {activeCards}
                            </div>
                            <div label={`Queue (${this.state.queue.length})`}>
                                {queueCards}
                            </div>
                        </Tabs>
                    </div>
                    <div className="slds-col slds-size_1-of-3 slds-p-around_x-small">
                        <ul className="slds-timeline">
                            {historyCards}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }
}

class AdminHeader extends React.Component {
    static defaultProps = {
        icon: {name: "calibration", category: "standard"}
    };

    render() {
        return (
            <div className="slds-page-header">
                <div className="slds-grid">
                    <div className="slds-col slds-has-flexi-truncate">
                        <div className="slds-media">
                            <div className="slds-media__figure">
                                <Icon name={this.props.icon.name} category={this.props.icon.category} size="large"/>
                            </div>
                            <div className="slds-media__body">
                                <p className="slds-text-heading--label">{this.props.type}</p>
                                <div className="slds-grid">
                                    <h1 className="slds-text-heading--medium slds-m-right--small slds-truncate slds-align-middle"
                                        title={this.props.title}>{this.props.title}</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="slds-col slds-no-flex slds-align-bottom">
                        <div className="slds-button-group" role="group">
                            {this.props.children}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

class ProgressBar extends React.Component {
    render() {
        let pct = `${Math.floor(this.props.progress * 100)}%`;
        return (
            <div>
                <div className="slds-grid slds-grid_align-spread slds-p-bottom_x-small" id="progress-bar-label-id-1">
                    <span>{this.props.message}</span>
                    <span aria-hidden="true">
                      <strong>{pct} complete</strong>
                    </span>
                </div>
                <div className="slds-progress-bar">
                    <span className={`slds-progress-bar__value ${this.props.success && this.props.progress === 1 ? "slds-progress-bar__value_success" : ""}`} style={{width: pct}}/>
                </div>
            </div>
        );
    }
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
        let lines = this.props.lines.map((r,i) => <li key={i} className="slds-item">{r}</li>);
        return (
            <ul className={this.props.divider ? this.props.divider : "slds-list_ordered"}>
                {lines}
            </ul>
        );
    }
}

class TimelineEntry extends React.Component {
    state = {type: this.props.type || "task", isopen: ""};
    toggleExpando = () => {
        this.setState(prevState => ({isopen: prevState.isopen === "" ? "slds-is-open" : ""}));
    };

    render() {
        let interval = "";
        if (this.props.interval) {
            interval = 
                <div className="slds-no-flex">
                    <span className="slds-icon_container slds-icon-utility-rotate" title={`Recurring every ${moment.duration(this.props.interval).humanize()}`}>
                      <svg className="slds-icon slds-icon_xx-small slds-icon-text-default slds-m-left_x-small">
                        <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#rotate" xmlnsXlink="http://www.w3.org/1999/xlink" />
                      </svg>
                    </span>
                </div>;
        }

        return (
            <li>
                <div className={`slds-timeline__item_expandable slds-timeline__item_${this.state.type} ${this.state.isopen}`}>
                    <span className="slds-assistive-text">{this.state.type}</span>
                    <div className="slds-media">
                        <div className="slds-media__figure">
                            <button className="slds-button slds-button_icon" onClick={this.toggleExpando}>
                                <svg className="slds-button__icon slds-timeline__details-action-icon" aria-hidden="true">
                                    <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#switch" xmlnsXlink="http://www.w3.org/1999/xlink" />
                                </svg>
                            </button>
                            <div className={`slds-icon_container slds-icon-standard-${this.state.type} slds-timeline__icon`}
                                title={this.state.type}>
                                <svg className="slds-icon slds-icon_small" aria-hidden="true">
                                    <use xlinkHref={`/assets/icons/standard-sprite/svg/symbols.svg#${this.state.type}`}
                                         xmlnsXlink="http://www.w3.org/1999/xlink"/>
                                </svg>
                            </div>
                        </div>
                        <div className="slds-media__body">
                            <div className="slds-grid slds-grid_align-spread slds-timeline__trigger">
                                <div className="slds-grid slds-grid_vertical-align-center slds-truncate_container_75 slds-no-space">
                                    <h3 className="slds-truncate"
                                        title={this.props.subject}>
                                        <a>
                                            <strong>{this.props.subject}</strong>
                                        </a>
                                    </h3>
                                    {interval}
                                </div>
                                <div className="slds-timeline__actions slds-timeline__actions_inline">
                                    <p className="slds-timeline__date">{this.props.timestamp}</p>
                                </div>
                            </div>
                            {this.props.children}
                        </div>
                    </div>
                </div>
            </li>
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
                        </div> : currentAction.label }
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
                            <span className="slds-icon_container slds-icon-standard-bot"
                                  title="description of icon when needed">
                              <svg className="slds-icon slds-icon_small" aria-hidden="true">
                                <use xlinkHref="/assets/icons/standard-sprite/svg/symbols.svg#bot"
                                     xmlnsXlink="http://www.w3.org/1999/xlink"/>
                              </svg>
                            </span>
                        </div>
                        <div className="slds-media__body">
                            <span className="slds-text-heading_small">{this.props.title}</span>
                            {this.props.status === "Complete" ? 
                                <span style={{borderRadius: "4px", padding: "0 4px 0 4px"}} className="slds-float--right slds-theme--success slds-text-color_inverse">{this.props.status}</span> :
                                <span style={{borderRadius: "4px", padding: "0 4px 0 4px"}} className="slds-float--right slds-theme--error slds-text-color_inverse">{this.props.status}</span> 
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