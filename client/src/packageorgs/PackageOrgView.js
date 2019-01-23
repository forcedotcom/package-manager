import React from 'react';

import * as packageVersionService from "../services/PackageVersionService";
import * as upgradeItemService from "../services/UpgradeItemService";

import Tabs from "../components/Tabs";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import PackageVersionCard from "./../packageversions/PackageVersionCard";
import UpgradeItemCard from "../upgrades/UpgradeItemCard";


export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		
		this.revealAccessToken = this.revealAccessToken.bind(this);
		this.fetchVersions = this.fetchVersions.bind(this);
		this.fetchUpgradeItems = this.fetchUpgradeItems.bind(this);
	}

	// Lifecycle
	render() {
		return (
			<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
				<div className="slds-form--stacked slds-grid slds-wrap slds-m-top">
					<div className="slds-col--padded slds-size--1-of-1">
						<div className="slds-grid slds-wrap slds-m-top--large">
							<div className="slds-col--padded slds-size--1-of-2 slds-m-top--medium">
								<dl className="page-header--rec-home__detail-item">
									<dt>
										<p className="slds-text-heading--label slds-truncate"
										   title="Instance URL">Status</p>
									</dt>
									<dd>
										<p className="slds-text-body--regular slds-truncate"
										   title="">{this.props.packageorg.status}</p>
									</dd>
								</dl>
							</div>
							<div className="slds-col--padded slds-size--1-of-2 slds-m-top--medium">
								<dl className="page-header--rec-home__detail-item">
									<dt>
										<p className="slds-text-heading--label slds-truncate" title="Username">Instance
											Name</p>
									</dt>
									<dd>
										<p className="slds-text-body--regular slds-truncate"
										   title="">{this.props.packageorg.instance_name}</p>
									</dd>
								</dl>
							</div>
							<div className="slds-col--padded slds-size--1-of-2 slds-m-top--medium">
								<dl className="page-header--rec-home__detail-item">
									<dt>
										<p className="slds-text-heading--label slds-truncate"
										   title="Instance URL">Namespace</p>
									</dt>
									<dd>
										<p className="slds-text-body--regular slds-truncate"
										   title="">{this.props.packageorg.namespace}</p>
									</dd>
								</dl>
							</div>
							<div className="slds-col--padded slds-size--1-of-2 slds-m-top--medium">
								<dl className="page-header--rec-home__detail-item">
									<dt>
										<p className="slds-text-heading--label slds-truncate" title="Instance URL">Instance
											URL</p>
									</dt>
									<dd>
										<p className="slds-text-body--regular slds-truncate"
										   title="">{this.props.packageorg.instance_url}</p>
									</dd>
								</dl>
							</div>

							{this.props.packageorg.access_token ?
							<div className="slds-col--padded slds-size--1-of-1 slds-m-top--medium">
								<dl className="page-header--rec-home__detail-item">
									<dt>
										<p className="slds-text-heading--label slds-truncate" title="Username">Access
											Token</p>
									</dt>
									<dd>
										<p><input className="slds-input" type="text" readOnly="true"
												  value="Double-click to reveal" onDoubleClick={this.revealAccessToken}/>
										</p>
									</dd>
								</dl>
							</div> : "" }
						</div>
					</div>
				</div>
				{this.props.packageorg.namespace ?
					<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
						<Tabs id="PackageOrgView">
							<div label="Package Versions">
								<PackageVersionCard onFetch={this.fetchVersions}/>
							</div>
							<div label="Package Upgrades">
								<UpgradeItemCard id="PackageUpgradeItemCard" onFetch={this.fetchUpgradeItems} refetchOn="upgrade-items"/>
							</div>
						</Tabs>
						<DataTableFilterHelp/>
					</div>
					 : ""}
			</div>
		)
	}
	
	// Handlers
	revealAccessToken(event) {
		if (event.target.value === this.props.packageorg.access_token) {
			event.target.value = 'Double-click to reveal';
		} else {
			event.target.value = this.props.packageorg.access_token;
			event.target.select();
		}
	}

	fetchVersions() {
		return packageVersionService.findByPackageOrgId(this.props.packageorg.org_id);
	}

	fetchUpgradeItems() {
		return upgradeItemService.findByPackageOrg(this.props.packageorg.org_id);
	};
}