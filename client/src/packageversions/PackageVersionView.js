import React from 'react';
import * as orgService from "../services/OrgService";
import * as sortage from "../services/sortage";

import OrgCard from "../orgs/OrgCard";

export default class extends React.Component {
    SORTAGE_KEY = "OrgCard";

    state = {packageVersion: this.props.packageVersion, sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "account_name", "asc")};

    componentWillReceiveProps(props) {
        if (props.packageVersion.sfid) {
            orgService.requestByPackageVersion(props.packageVersion.sfid, this.state.sortOrder).then(orgs => this.setState({orgs}));
        }
    }

    sortHandler = (field) => {
        let sortOrder = sortage.changeSortOrder(this.SORTAGE_KEY, field);
        orgService.requestByPackageVersion(this.state.packageVersion.sfid, sortOrder).then(orgs => this.setState({orgs, sortOrder}));
    };


    render() {
        return (
            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top">
                <div className="slds-col--padded slds-size--1-of-1">
                    <div className="slds-grid slds-wrap slds-m-top--large">
                        <div className="slds-col--padded slds-size--1-of-1">
                            <br/>
                            <OrgCard title="Customers" orgs={this.state.orgs} onSort={this.sortHandler}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}