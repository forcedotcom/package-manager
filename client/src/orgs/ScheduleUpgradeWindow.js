import React from 'react';
import DatePicker from "react-datepicker";
import moment from 'moment';

import 'react-datepicker/dist/react-datepicker.css';
import '../components/datepicker.css';
import {HeaderIcon} from "../components/Icons";

export default class extends React.Component {
    state = {
        versions: this.props.versions,
        startDate: moment().add(15, 'minutes'),
        description: this.props.description || ""
    };

    handleDateChange = (startDate) => {
        this.setState({startDate});
    };
    
    handleDescriptionChange = (event) => {
        this.setState({description: event.target.value});
    };
    
    upgradeHandler = () => {
        this.props.onUpgrade(this.state.versions, this.state.startDate, this.state.description);
    };

    handleVersionChange = (versions) => {
        this.setState({versions});
    };

    render() {
        return (
            <div>
                <div aria-hidden="false" role="dialog" className="slds-modal slds-fade-in-open">
                    <div className="slds-modal__container">
                        <div className="slds-modal__header">
                            <h2 className="slds-text-heading--medium">Schedule Upgrade</h2>
                            <button className="slds-button slds-modal__close">
                                <svg aria-hidden="true" className="slds-button__icon slds-button__icon--inverse slds-button__icon--large">
                                </svg>
                                <span className="slds-assistive-text">Close</span>
                            </button>
                        </div>
                        <div className="slds-modal__content slds-p-around_medium">

                            <div className="slds-form slds-form_stacked slds-wrap  slds-m-around--medium">
                                <div className="slds-form-element">
                                    <label className="slds-form-element__label" htmlFor="name">Description</label>
                                    <div className="slds-form-element__control">
                                        <textarea className="slds-input" rows={2} id="description" value={this.state.description} onChange={this.handleDescriptionChange}/>
                                    </div>
                                </div>
                                <div className="slds-form-element">
                                    <label className="slds-form-element__label">Selected Versions</label>
                                    {this.props.versions ? <VersionPills versions={this.props.versions} onUpdateVersions={this.handleVersionChange.bind(this)}/> : ""}
                                </div>
                                <div className="slds-form-element">
                                    <label className="slds-form-element__label" htmlFor="text-input-id-1">Start Date</label>
                                    <DatePicker className="slds-input"
                                        selected={this.state.startDate}
                                        onChange={this.handleDateChange}
                                        showTimeSelect
                                        timeFormat="HH:mm"
                                        timeIntervals={5}
                                        dateFormat="LLL"
                                        timeCaption="time"/>
                                </div>
                            </div>
                        </div>

                        <div className="slds-modal__footer">
                            <button className="slds-button slds-button--neutral" onClick={this.props.onCancel}>Cancel</button>
                            <button className="slds-button slds-button--neutral slds-button--brand" onClick={this.upgradeHandler.bind(this)}>Schedule</button>
                        </div>
                    </div>
                </div>
                <div className="slds-modal-backdrop slds-modal-backdrop--open"></div>
            </div>
        );
    }
}

class VersionPills extends React.Component {
    state = {versions: this.props.versions};

    handleRemove = (version) => {
        let newVersions = [];
        for (let i=0; i < this.state.versions.length; i++) {
            if(this.state.versions[i].id !== version.id) {
                newVersions.push(this.state.versions[i]);
            }
        }
        this.setState({versions: newVersions});
        this.props.onUpdateVersions(newVersions);
    };

    render() {
        let pills = this.props.versions.map(v =>
            <VersionPill key={v.id} version={v} onRemove={this.state.versions.length > 1 ? this.handleRemove : undefined}/>
        );
        return (
            <div>{pills}</div>);
    }
}
class VersionPill extends React.Component {
    state = {version: this.props.version};

    handleRemove = () => {
        this.props.onRemove(this.props.version);
        delete this.state.version;
    };

    render() {
        return !this.state.version ? (<span/>) : (
            <span className="slds-pill slds-pill_link slds-m-right--xxx-small">
              <span className="slds-pill__icon_container">
                <HeaderIcon name="thanks" category="standard"/>
              </span>
              <div className="slds-pill__action" title={this.state.version.package_name + ' ' + this.state.version.latest_version_number}>
                <span className="slds-pill__label">{this.state.version.package_name}</span>
              </div>
              <button disabled={!this.props.onRemove} className="slds-button slds-button_icon slds-button_icon slds-pill__remove" title="Remove"
                    onClick={this.handleRemove}>
                  <svg className="slds-button__icon" aria-hidden="true">
                    <use xmlnsXlink="http://www.w3.org/1999/xlink"
                         xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#close"/>
                  </svg>
                  <span className="slds-assistive-text">Remove</span>
              </button>
            </span>
        );
    }
}