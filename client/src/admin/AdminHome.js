import React from 'react';

import * as adminService from '../services/AdminService';

import {Icon} from "../components/Icons";
import {ADMIN_ICON} from "../Constants";
import {NotificationManager} from "react-notifications";
import * as io from "socket.io-client";

export default class extends React.Component {
    state = {settings: {}};

    componentDidMount() {
        // adminService.request().then(settings => this.setState({settings}));
    }

    fetchHandler = () => {
        NotificationManager.info(`Fetching latest package, license and org data`, "Fetching");
        adminService.fetch().then(response => {
            console.log(response);
        }).catch(e => NotificationManager.error(`Failed to fetch latest package, license and org data. ${e.message || e}`, "Failure", 8000))
    };

    fetchSubsHandler = () => {
        NotificationManager.info(`Fetching org data from package subscribers`, "Fetching Subscribers");
        adminService.fetchSubscribers().then(response => {
            console.log(response);
        }).catch(e => NotificationManager.error(`Failed to fetch latest package, license and org data. ${e.message || e}`, "Failure", 8000))
    };

    refetchInvalidHandler = () => {
        NotificationManager.info(`Re-fetching orgs marked as invalid`, "Fetching Invalids");
        adminService.fetchInvalid().then(response => {
            console.log(response);
        }).catch(e => NotificationManager.error(`Failed to re-fetching orgs marked as invalid. ${e.message || e}`, "Failure", 8000))
    };
    
    refetchAllHandler = () => {
        NotificationManager.info(`Fetching all package, license and org data`, "Fetching All");
        adminService.fetch(true).then(response => {
            NotificationManager.success(`Fetched all package, license and org data`, "Success", 5000);
            console.log(response);
        }).catch(e => NotificationManager.error(`Failed to fetch all package, license and org data.  ${e.message || e}`, "Failure", 8000))
    };
    
    render() {
        return (
            <div>
                <AdminHeader type="Admin" icon={ADMIN_ICON} title="Administration" onUpgrade={this.openSchedulerWindow}>
                    {/*<button className="slds-button slds-button--neutral" onClick={this.fetchSubsHandler}>Fetch Subscribers</button>*/}
                    <button className="slds-button slds-button--neutral" onClick={this.fetchHandler}>Fetch Latest</button>
                    <button className="slds-button slds-button--neutral" onClick={this.refetchInvalidHandler}>Re-Fetch Invalid Orgs</button>
                    <button className="slds-button slds-button--neutral" onClick={this.refetchAllHandler}>Re-Fetch All</button>
                </AdminHeader>
                <ProgressBar/>
                <Socker/>

                
                {/*<div className="slds-grid slds-gutters">
                    <div className="slds-col slds-size_2-of-3">
                        <Section title="Section Tootle">
                            <div className="slds-card">
                                <AdminCard title="Something cooler">
                                    <ProgressBar/>
                                </AdminCard>
                            </div>
                            <div className="slds-card ">
                                <AdminCard title="Something cooler">
                                    <ProgressBar/>
                                </AdminCard>
                            </div>
                        </Section>
                    </div>
                    <div className="slds-col slds-size_1-of-3 slds-p-around_x-small">
                        <ul className="slds-timeline">
                            <TimelineEntry>
                                <p className="slds-m-horizontal_xx-small">This happened, like, so much.  Everywhere, splattering and shuddering in poo.</p>
                                <article className="slds-box slds-timeline__item_details slds-theme_shade slds-m-top_x-small slds-m-horizontal_xx-small slds-p-around_medium"
                                         id="task-item-expanded" aria-hidden="false">
                                    <div>
                                        <span className="slds-text-title">Description</span>
                                        <p className="slds-p-top_x-small">Something cooler</p>
                                    </div>
                                </article>
                            </TimelineEntry>
                        </ul>
                    </div>
                </div>*/}
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
                            {/*<button className="slds-button slds-button--neutral" onClick={this.props.onEdit}>Edit</button>*/}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

class Socker extends React.Component {
    constructor() {
        super();
        this.state = {
            response: false,
            endpoint: "http://127.0.0.1:5000"
        };
    }

    componentDidMount() {
        const { endpoint } = this.state;
        let socket = io.connect(endpoint);
        socket.on('news', function (data) {
            console.log(data);
            socket.emit('my other event', { my: 'data' });
        });
    }

    render() {
        const { response } = this.state;
        return (
            <div style={{ textAlign: "center" }}>
                {response
                    ? <p>
                        The temperature in Florence is: {response} °F
                    </p>
                    : <p>Loading...</p>}
            </div>
        );
    }
}

class ProgressBar extends React.Component {
    render() {
        return (
            <div className="slds-progress-bar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="25"
                 role="progressbar">
              <span className="slds-progress-bar__value" style={{width: '25%'}}>
                <span className="slds-assistive-text">Progress: 25%</span>
              </span>
            </div>
        );
    }
}

/*
class Section extends React.Component {
    state = {isopen: "slds-is-open"};
    toggleExpando = () => {
        this.setState(prevState => ({isopen: prevState.isopen === "" ? "slds-is-open" : ""}));
    };
    render() {
        return (
            <div class={`slds-p-left_x-small slds-section ${this.state.isopen}`}>
                <h3 className="slds-section__title">
                    <button className="slds-button slds-section__title-action" onClick={this.toggleExpando}>
                        <svg
                            className="slds-section__title-action-icon slds-button__icon slds-button__icon_left"
                            aria-hidden="true">
                            <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#switch"
                                 xmlnsXlink="http://www.w3.org/1999/xlink"/>
                        </svg>
                        <span className="slds-truncate" title="Section Title">{this.props.title}</span>
                    </button>
                </h3>
                <div aria-hidden="true" className="slds-section__content" id="expando-unique-id">
                    {this.props.children}
                </div>
            </div>
        );
    }
}
class TimelineEntry extends React.Component {
    state = {type: "email", subject: "Bobahobo rulez", timestamp: "10:00am | 3/24/18", isopen: ""};
    toggleExpando = () => {
        this.setState(prevState => ({isopen: prevState.isopen === "" ? "slds-is-open" : ""}));
    };

    render() {
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
                                        title={this.state.subject}>
                                        <a>
                                            <strong>{this.state.subject}</strong>
                                        </a>
                                    </h3>
                                    <div className="slds-no-flex">
                                        <span className="slds-icon_container slds-icon-utility-rotate" title="Recurring Task">
                                          <svg className="slds-icon slds-icon_xx-small slds-icon-text-default slds-m-left_x-small" aria-hidden="true">
                                            <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#rotate" xmlnsXlink="http://www.w3.org/1999/xlink" />
                                          </svg>
                                          <span className="slds-assistive-text">Recurring Task</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="slds-timeline__actions slds-timeline__actions_inline">
                                    <p className="slds-timeline__date">{this.state.timestamp}</p>
                                    <button
                                        className="slds-button slds-button_icon slds-button_icon-border-filled slds-button_icon-x-small"
                                        aria-haspopup="true" title="More Options for this item">
                                        <svg className="slds-button__icon" aria-hidden="true">
                                            <use
                                                xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#down"
                                                xmlnsXlink="http://www.w3.org/1999/xlink"/>
                                        </svg>
                                        <span className="slds-assistive-text">More Options for this item</span>
                                    </button>
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
        return (
            <article className="slds-card">
                <div className="slds-card__header slds-grid">
                    <header className="slds-media slds-media_center slds-has-flexi-truncate">
                        <div className="slds-media__figure">
                            <span className="slds-icon_container slds-icon-standard-contact"
                                  title="description of icon when needed">
                              <svg className="slds-icon slds-icon_small" aria-hidden="true">
                                <use xlinkHref="/assets/icons/standard-sprite/svg/symbols.svg#contact"
                                     xmlnsXlink="http://www.w3.org/1999/xlink"/>
                              </svg>
                            </span>
                        </div>
                        <div className="slds-media__body">
                            <h2>
                                <a className="slds-card__header-link slds-truncate">
                                    <span className="slds-text-heading_small">{this.props.title}</span>
                                </a>
                            </h2>
                        </div>
                    </header>
                    <div className="slds-no-flex">
                        <button className="slds-button slds-button_neutral">New</button>
                    </div>
                </div>
                <div className="slds-card__body slds-card__body_inner">

                    <div className="slds-grid slds-gutters">
                        <div className="slds-col slds-size_2-of-3">
                            <div className="slds-box_x-small slds-m-around_x-small">


                            </div>
                        </div>
                        <div className="slds-col slds-size_1-of-3">
                            <div className="slds-box_x-small slds-text-align_center slds-m-around_x-small">
                            </div>
                        </div>
                    </div>
                    {this.props.children}
                </div>
            </article>
        );
    }
}
*/