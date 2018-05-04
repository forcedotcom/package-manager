import React from 'react';
import Lookup from "../components/Lookup";
import * as orgGroupService from "../services/OrgGroupService";
import {ORG_GROUP_ICON} from "../Constants";

export default class extends React.Component {
    state = {items: []};

    componentDidMount() {
        orgGroupService.requestByTextSearch("").then(items => this.setState({items: items}));
    }
    
    searchKeyChangeHandler = (key) => {
        let text = key.target.value || "";
        orgGroupService.requestByTextSearch(text).then(items => this.setState({items: items}));
    };
    
    groupChangeHandler = (groupId) => {
        this.props.onAdd(groupId);
    };

    render() {
        return (
            <div>
                <div className="slds-modal slds-fade-in-open">
                    <div className="slds-modal__container">
                        <div className="slds-modal__header">
                            <button className="slds-button slds-modal__close">
                                <svg aria-hidden="true" className="slds-button__icon slds-button__icon--inverse slds-button__icon--large">
                                </svg>
                                <span className="slds-assistive-text">Close</span>
                            </button>
                            <h2 className="slds-text-heading--medium">Select Group</h2>
                        </div>
                        <div style={{height: 450}} className="slds-modal__content slds-p-around_medium">
                            <Lookup placeholder="Select a group"
                                    items={this.state.items}
                                    valueField="id"
                                    labelField="name"
                                    icon={ORG_GROUP_ICON}
                                    descriptionField="description"
                                    onSearchKeyChange={this.searchKeyChangeHandler}
                                    onChange={this.groupChangeHandler} />
                        </div>

                        <div className="slds-modal__footer">
                            <button className="slds-button slds-button--neutral" onClick={this.props.onCancel}>Cancel</button>
                        </div>
                    </div>
                </div>
                <div className="slds-modal-backdrop slds-modal-backdrop--open"></div>
            </div>
        );
    }
}