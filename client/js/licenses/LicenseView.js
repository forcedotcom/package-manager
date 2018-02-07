import React from 'react';

// import * as activityService from '../services/ActivityService';

import Tabs from '../components/Tabs';

export default React.createClass({

    getInitialState() {
        return {activities: []};
    },

    componentWillReceiveProps(props) {
        // this.loadActivities(props.license.id);
    },

    loadActivities(licenseId) {
        // activityService.findByLicense(licenseId).then(activities => this.setState({activities}));
    },

    render() {

        let title = {
           fontSize: "24px",
           fontWeight: "300",
           padding: "12px 0 6px 0"
        };

        return (

            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top">

                <div className="slds-col--padded slds-size--1-of-1 slds-medium-size--1-of-2">

                    <div className="slds-grid slds-wrap slds-m-top--large">

                        <div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Name of account on license">Account</p>
                                </dt>
                                <dd>
                                    <p className="slds-text-body--regular slds-truncate" title="">{this.props.license.account_name}</p>
                                </dd>
                            </dl>
                        </div>

                        <div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Number of licenses currently in use">Used Licenses</p>
                                </dt>
                                <dd>
                                    <p className="slds-text-body--regular slds-truncate" title="">{this.props.license.used_license_count}</p>
                                </dd>
                            </dl>
                        </div>

                        <div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="ID of Salesforce Org">Org ID</p>
                                </dt>
                                <dd>
                                    <p className="slds-text-body--regular slds-truncate" title="">{this.props.license.org_id}</p>
                                </dd>
                            </dl>
                        </div>

                        <div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Name of Salesforce instance">Instance</p>
                                </dt>
                                <dd>
                                    <p className="slds-text-body--regular slds-truncate" title="">{this.props.license.instance}</p>
                                </dd>
                            </dl>
                        </div>

                        <div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Name of the installed package version">Package Version</p>
                                </dt>
                                <dd>
                                    <p className="slds-text-body--regular slds-truncate" title="">{this.props.license.package_version_name}</p>
                                </dd>
                            </dl>
                        </div>

                        <div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Expiration date of the license">Expiration</p>
                                </dt>
                                <dd>
                                    <p className="slds-text-body--regular slds-truncate" title="">{this.props.license.expiration}</p>
                                </dd>
                            </dl>
                        </div>

                    </div>
                </div>

                <div className="slds-col--padded slds-size--1-of-1 slds-medium-size--1-of-2">
                    <Tabs>
                        <div label="Activities">
                            {/*<ActivityTimeline propertyId={this.props.property.property_id} activities={this.state.activities} showContact={true} showProperty={false}/>*/}
                        </div>
                        <div label="Hmmm...">
                        </div>
                    </Tabs>
                </div>

                <div className="slds-col--padded slds-size--1-of-1">
                    <br/>
                    {/*<ActivityCard licenseId={this.props.license.id} activities={this.state.activities} showAccount={true} showLicense={false}/>*/}
                    {/*<AccountCard licenseId={this.props.license.id}/>*/}
                </div>
            </div>
        );
    }

});