import React from 'react';

import * as packageVersionService from "../services/PackageVersionService";
import * as orgService from "../services/OrgService";
import * as sortage from '../services/sortage';

import PackageVersionCard from '../packageversions/PackageVersionCard';
import OrgCard from "../orgs/OrgCard";
import Tabs from '../components/Tabs';


export default class extends React.Component {
    SORTAGE_KEY_VERSIONS = "PackageVersionCard";
    SORTAGE_KEY_ORGS = "OrgCard";

    state = {
        pkg: {},
        sortOrderVersions: sortage.getSortOrder(this.SORTAGE_KEY_VERSIONS, "name", "asc"),
        sortOrderOrgs: sortage.getSortOrder(this.SORTAGE_KEY_ORGS, "account_name", "asc")
    };

    componentWillReceiveProps(props) {
        if (props.pkg.sfid) {
            this.setState({pkg: props.pkg});
            packageVersionService.findByPackage(props.pkg.sfid, this.state.sortOrderVersions).then(packageVersions => this.setState({packageVersions}));
            orgService.requestByPackage(props.pkg.sfid, this.state.sortOrderOrgs).then(orgs => this.setState({orgs}));
        }
    };

    orgSortHandler = (field) => {
        let sortOrder = sortage.changeSortOrder(this.SORTAGE_KEY_ORGS, field);
        orgService.requestByPackage(this.state.pkg.sfid, sortOrder).then(orgs=> this.setState({orgs, sortOrderOrgs: sortOrder}));
    };

    render() {
        return (
            <div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
                <Tabs id="PackageView">
                    <div label="Versions">
                        <PackageVersionCard packageVersions={this.state.packageVersions}/>
                    </div>
                    <div label="Customers">
                        <OrgCard title="Customers" orgs={this.state.orgs} onSort={this.orgSortHandler.bind(this)}/>
                    </div>
                </Tabs>
            </div>
        );
    }
}