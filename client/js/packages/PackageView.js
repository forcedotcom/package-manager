import React from 'react';
import PackageVersionCard from './../packageversions/PackageVersionCard';
import * as packageVersionService from "../services/PackageVersionService";
import * as orgService from "../services/OrgService";
import OrgCard from "../orgs/OrgCard";
import Tabs from '../components/Tabs';

export default React.createClass({

    getInitialState() {
        return {};
    },

    componentWillReceiveProps(props) {
        this.loadCards(props.pkg.sfid);
    },

    loadCards(packageId) {
        packageVersionService.findByPackage(packageId).then(packageVersions => this.setState({packageVersions}));
        orgService.requestByPackage(packageId).then(orgs=> this.setState({orgs}));
    },

    render() {
        return (
            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top">
                <Tabs>
                    <div label="Versions">
                        <PackageVersionCard packageVersions={this.state.packageVersions}/>
                    </div>
                    <div label="Customers">
                        <OrgCard title="Customers" orgs={this.state.orgs}/>
                    </div>
                </Tabs>
            </div>
        );
    }
});