import React from 'react';

export default React.createClass({

    getInitialState() {
        return {activities: []};
    },

    componentWillReceiveProps(props) {
    },

    versionLinkHandler() {
        window.location.hash = "#packageVersion/" + this.props.license.package_version_id;
    },

    render() {

        let title = {
           fontSize: "24px",
           fontWeight: "300",
           padding: "12px 0 6px 0"
        };

        return (

            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top">
                <div className="slds-col--padded slds-size--1-of-1">
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
                                    <p className="slds-text-heading--label slds-truncate" title="Name of the installed package version">Version Name</p>
                                </dt>
                                <dd>
                                    <a className="slds-text-body--regular slds-truncate" href="#" onClick={this.versionLinkHandler} title="">{this.props.license.version_name}</a>
                                </dd>
                            </dl>
                        </div>
                        <div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
                            <dl className="page-header--rec-home__detail-item">
                                <dt>
                                    <p className="slds-text-heading--label slds-truncate" title="Name of the installed package version">Version Number</p>
                                </dt>
                                <dd>
                                    <a className="slds-text-body--regular slds-truncate" href="#" onClick={this.versionLinkHandler} title="">{this.props.license.version_number}</a>
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
            </div>
        );
    }

});