import React from 'react';
import * as orgService from "../services/OrgService";
import OrgCard from "../orgs/OrgCard";

export default React.createClass({

    getInitialState() {
        return {};
    },

    componentWillReceiveProps(props) {
        this.loadCards(props.packageVersion.sfid);
    },

    loadCards(packageVersionId) {
        orgService.requestByPackageVersion(packageVersionId).then(orgs => this.setState({orgs}));
    },

    render() {
        return (
            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top">
                <div className="slds-col--padded slds-size--1-of-1">
                    <div className="slds-grid slds-wrap slds-m-top--large">
                        <div className="slds-col--padded slds-size--1-of-1">
                            <br/>
                            <OrgCard title="Customers" orgs={this.state.orgs}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});