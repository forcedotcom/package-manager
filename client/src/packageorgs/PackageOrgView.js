import React from 'react';

import * as packageVersionService from '../services/PackageVersionService';

import PackageVersionCard from './../packageversions/PackageVersionCard';
import * as sortage from "../services/sortage";

export default class extends React.Component {
    SORTAGE_KEY_VERSIONS = "PackageVersionCard";

    state = {
        sortOrderVersions: sortage.getSortOrder(this.SORTAGE_KEY_VERSIONS, "release_date", "asc"),
    };

    revealAccessToken = (event) => {
        if (event.target.value === this.props.packageorg.access_token) {
            event.target.value = 'Double-click to reveal';
        } else {
            event.target.value = this.props.packageorg.access_token;
            event.target.select();
        }
    };

    componentWillReceiveProps(props) {
        packageVersionService.findByPackageOrgId(props.packageorg.org_id, this.state.sortOrderVersions).then(packageVersions => this.setState({packageVersions}));
    }

    render() {
        return (
            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top">
                <div className="slds-col--padded slds-size--1-of-1">
                    <div className="slds-grid slds-wrap slds-m-top--large">
                        <div className="slds-col--padded slds-size--1-of-2 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Username">Instance Name</p>
                                </dt>
                                <dd>
                                    <p className="slds-text-body--regular slds-truncate" title="">{this.props.packageorg.instance_name}</p>
                                </dd>
                            </dl>
                        </div>
                        <div className="slds-col--padded slds-size--1-of-2 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Instance URL">Instance URL</p>
                                </dt>
                                <dd>
                                    <p className="slds-text-body--regular slds-truncate" title="">{this.props.packageorg.instance_url}</p>
                                </dd>
                            </dl>
                        </div>

                        <div className="slds-col--padded slds-size--1-of-1 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Username">Access Token</p>
                                </dt>
                                <dd>
                                    <p><input className="slds-input" type="text" readonly="true" value="Double-click to reveal" onDoubleClick={this.revealAccessToken}/></p>
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>
                <div className="slds-col--padded slds-size--1-of-1">
                    <br/>
                    <PackageVersionCard packageVersions={this.state.packageVersions}/>
                </div>
            </div>
        );
    }
}