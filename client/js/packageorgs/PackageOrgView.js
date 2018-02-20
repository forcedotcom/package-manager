import React from 'react';
import moment from 'moment';

import * as packageVersionService from '../services/PackageVersionService';

import Tabs from '../components/Tabs';

import PackageVersionCard from './../packageversions/PackageVersionCard';

export default React.createClass({

    getInitialState() {
        return {properties: []};
    },

    componentWillReceiveProps(props) {
        packageVersionService.findByDevOrgId(props.packageorg.org_id).then(packageversions => this.setState({packageversions}));
    },

    render() {

        return (
            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top">
                <div className="slds-col--padded slds-size--1-of-1">
                    <div className="slds-grid slds-wrap slds-m-top--large">
                        <div className="slds-col--padded slds-size--1-of-3 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Org ID">Org ID</p>
                                </dt>
                                <dd>
                                    <p className="slds-text-body--regular slds-truncate" title="">{this.props.packageorg.org_id}</p>
                                </dd>
                            </dl>
                        </div>
                        <div className="slds-col--padded slds-size--1-of-3 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Username">Username</p>
                                </dt>
                                <dd>
                                    <p className="slds-text-body--regular slds-truncate" title="">{this.props.packageorg.username}</p>
                                </dd>
                            </dl>
                        </div>
                        <div className="slds-col--padded slds-size--1-of-3 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Instance URL">Instance URL</p>
                                </dt>
                                <dd>
                                    <p className="slds-text-body--regular slds-truncate" title="">{this.props.packageorg.instance_url}</p>
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>
                <div className="slds-col--padded slds-size--1-of-1">
                    <br/>
                    <PackageVersionCard packageVersions={this.state.packageversions}/>
                </div>
            </div>
        );
    }
});