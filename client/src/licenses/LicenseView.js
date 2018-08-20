import React from 'react';
import {Link} from "react-router-dom";
import moment from "moment/moment";

export default class extends React.Component {
	state = {activities: []};

	render() {
		return (
			<div className="slds-form--stacked slds-grid slds-wrap slds-m-top">
				<div className="slds-col--padded slds-size--1-of-1">
					<div className="slds-grid slds-wrap slds-m-top--large">

						<div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
							<dl className="page-header--rec-home__detail-item">
								<dt>
									<p className="slds-text-heading--label slds-truncate"
									   title="Name of account on license">Account</p>
								</dt>
								<dd>
									<p className="slds-text-body--regular slds-truncate"
									   title="">{this.props.license.account_name}</p>
								</dd>
							</dl>
						</div>

						<div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
							<dl className="page-header--rec-home__detail-item">
								<dt>
									<p className="slds-text-heading--label slds-truncate"
									   title="Number of licenses currently in use">Used Licenses</p>
								</dt>
								<dd>
									<p className="slds-text-body--regular slds-truncate"
									   title="">{this.props.license.used_license_count}</p>
								</dd>
							</dl>
						</div>

						<div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
							<dl className="page-header--rec-home__detail-item">
								<dt>
									<p className="slds-text-heading--label slds-truncate"
									   title="ID of Salesforce Org">Org ID</p>
								</dt>
								<dd>
									<p className="slds-text-body--regular slds-truncate"
									   title="">{this.props.license.org_id}</p>
								</dd>
							</dl>
						</div>

						<div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
							<dl className="page-header--rec-home__detail-item">
								<dt>
									<p className="slds-text-heading--label slds-truncate"
									   title="Name of Salesforce instance">Instance</p>
								</dt>
								<dd>
									<p className="slds-text-body--regular slds-truncate"
									   title="">{this.props.license.instance}</p>
								</dd>
							</dl>
						</div>
						<div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
							<dl className="page-header--rec-home__detail-item">
								<dt>
									<p className="slds-text-heading--label slds-truncate"
									   title="Name of the installed package version">Version Name</p>
								</dt>
								<dd>
									<Link to={`/packageversion/${this.props.license.version_id}`}
										  className="slds-text-body--regular slds-truncate"
										  title="">{this.props.license.version_name}</Link>
								</dd>
							</dl>
						</div>
						<div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
							<dl className="page-header--rec-home__detail-item">
								<dt>
									<p className="slds-text-heading--label slds-truncate"
									   title="Name of the installed package version">Version Number</p>
								</dt>
								<dd>
									<Link to={`/packageversion/${this.props.license.version_id}`}
										  className="slds-text-body--regular slds-truncate"
										  title="">{this.props.license.version_number}</Link>
								</dd>
							</dl>
						</div>

						<div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-3 slds-m-top--medium">
							<dl className="page-header--rec-home__detail-item">
								<dt>
									<p className="slds-text-heading--label slds-truncate"
									   title="Expiration date of the license">Expiration</p>
								</dt>
								<dd>
									<p className="slds-text-body--regular slds-truncate"
									   title="">{moment(this.props.license.expiration).format("ll")}</p>
								</dd>
							</dl>
						</div>

					</div>
				</div>
			</div>
		);
	}
}