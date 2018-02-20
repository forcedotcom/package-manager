import React from 'react';
import PackageVersionCard from './../packageversions/PackageVersionCard';
import * as packageVersionService from "../services/PackageVersionService";

export default React.createClass({

    getInitialState() {
        return {};
    },

    componentWillReceiveProps(props) {
        this.loadPackageVersions(props.pkg.sfid);
    },

    loadPackageVersions(packageId) {
        packageVersionService.findByPackage(packageId).then(packageVersions => this.setState({packageVersions}));
    },

    render() {
        return (
            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top">
                <div className="slds-col--padded slds-size--1-of-1 slds-medium-size--1-of-2">
                    <div className="slds-grid slds-wrap slds-m-top--large">
                        <div className="slds-col--padded slds-size--1-of-1">
                            <br/>
                            <PackageVersionCard packageVersions={this.state.packageVersions}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});