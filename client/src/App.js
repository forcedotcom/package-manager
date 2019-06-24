import React, {Component} from 'react';
import {BrowserRouter as Router, Link, Route} from "react-router-dom";
import ReactTooltip from 'react-tooltip';
import {NotificationContainer} from 'react-notifications';
import debounce from "lodash.debounce";

import {Icon} from './components/Icons';

import LicenseHome from './licenses/LicenseHome';
import LicenseRecord from './licenses/LicenseRecord';

import OrgHome from './orgs/OrgHome';
import OrgRecord from './orgs/OrgRecord';

import PackageHome from './packages/PackageHome';
import PackageRecord from './packages/PackageRecord';

import PackageOrgHome from './packageorgs/PackageOrgHome';
import PackageOrgRecord from './packageorgs/PackageOrgRecord';

import OrgGroupRecord from "./orggroups/OrgGroupRecord";
import OrgGroupHome from "./orggroups/OrgGroupHome";

import UpgradeHome from './upgrades/UpgradeHome';
import UpgradeRecord from './upgrades/UpgradeRecord';

import AuthResponse from "./auth/AuthResponse";
import PackageVersionRecord from "./packageversions/PackageVersionRecord";
import AdminHome from "./admin/AdminHome";
import UpgradeItemRecord from "./upgrades/UpgradeItemRecord";

import Login from "./auth/Login";
import Logout from "./auth/Logout";
import Search from "./components/Search";

import * as authService from "./services/AuthService";
import "./services/notifications";

import {
	ADMIN_ICON,
	AUTH_ICON,
	LICENSE_ICON,
	ORG_GROUP_ICON,
	ORG_ICON,
	PACKAGE_ICON,
	PACKAGE_ORG_ICON,
	UPGRADE_ICON
} from "./Constants";

function getCompactSize() {
	return window.innerWidth > 1200 ? 2 : window.innerWidth > 900 ? 1 : 0;
}

class App extends Component {
	constructor(props) {
		super(props);

		this.state = {
			user: authService.getSessionUser(this),
			compactSize: getCompactSize()};

		this.handleWindowResize = this.handleWindowResize.bind(this);
	}

	handleWindowResize = debounce(() => {
		let compactSize = getCompactSize();
		if (this.state.compactSize !== compactSize) {
			this.setState({compactSize})
		}
	}, 100);

	componentDidMount() {
		window.addEventListener('resize', this.handleWindowResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.handleWindowResize);
	}

	render() {
		const {compactSize, user} = this.state;
		const isCompact = compactSize < 2;
		const isMini = compactSize < 1;
		return (
			<Router>
				<div>
					<header className="menu">
						<ul className="slds-list--horizontal">
							<li className="slds-list__item" title="Upgrades">
								<Link style={{whiteSpace: "nowrap"}} to="/"><Icon name={UPGRADE_ICON.name}
																						  category={UPGRADE_ICON.category}/>{isCompact ? "" : "Upgrades"}</Link>
							</li>
							<li className="slds-list__item" title="Packages">
								<Link style={{whiteSpace: "nowrap"}} to="/packages"><Icon name={PACKAGE_ICON.name}
																						  category={PACKAGE_ICON.category}/>{isCompact ? "" : "Packages"}</Link>
							</li>
							<li className="slds-list__item" title="Org Groups">
								<Link style={{whiteSpace: "nowrap"}} className="slds-nowrap" to="/orggroups"><Icon
									name={ORG_GROUP_ICON.name} category={ORG_GROUP_ICON.category}/>{isCompact ? "" : "Org Groups"}</Link>
							</li>
							<li className="slds-list__item" title="Orgs">
								<Link style={{whiteSpace: "nowrap"}} to="/orgs"><Icon name={ORG_ICON.name}
																				  category={ORG_ICON.category}/>{isCompact ? "" : "Orgs"}</Link>
							</li>
							<li className="slds-list__item" title="Licenses">
								<Link style={{whiteSpace: "nowrap"}} to="/licenses"><Icon name={LICENSE_ICON.name}
																						  category={LICENSE_ICON.category}/>{isCompact ? "" : "Licenses"}</Link>
							</li>
							<li className="slds-list__item" title="Connected Orgs">
								<Link style={{whiteSpace: "nowrap"}} to="/packageorgs"><Icon
									name={PACKAGE_ORG_ICON.name} category={PACKAGE_ORG_ICON.category}/>{isCompact ? "" : "Connected Orgs"}</Link>
							</li>
							<li className="slds-list__item" title="Administration">
								<Link style={{whiteSpace: "nowrap"}} to="/admin"><Icon name={ADMIN_ICON.name}
																					   category={ADMIN_ICON.category}/>{isCompact ? "" : "Administration"}</Link>
							</li>

							<li style={{width: "100%"}} className="slds-list__item">
								<Search/>
							</li>

							{user.username ?
								<li className="slds-list__item" title={`Logout ${user.display_name}`}>
									<Link data-tip data-for="logout" style={{whiteSpace: "nowrap"}} to="/logout"><Icon
										name={AUTH_ICON.name}
										category={AUTH_ICON.category}/>{isMini ? "" : `Logout ${user.display_name}`}</Link>
									<ReactTooltip id="logout" place="left" delayShow={600}>
										Logged in as {user.username}
									</ReactTooltip>
								</li> : ""}
						</ul>
					</header>

					<Route exact path="/" component={UpgradeHome}/>
					
					<Route path="/orgs" component={OrgHome}/>
					<Route path="/org/:orgId" component={OrgRecord}/>

					<Route path="/licenses" component={LicenseHome}/>
					<Route path="/license/:licenseId" component={LicenseRecord}/>

					<Route path="/orggroups" component={OrgGroupHome}/>
					<Route exact path="/orggroup/:orgGroupId" component={OrgGroupRecord}/>

					<Route path="/packages" component={PackageHome}/>
					<Route path="/package/:packageId" component={PackageRecord}/>

					<Route path="/packageversion/:versionId" component={PackageVersionRecord}/>

					<Route path="/upgradeitem/:itemId" component={UpgradeItemRecord}/>

					<Route path="/upgrades" component={UpgradeHome}/>
					<Route path="/upgrade/:upgradeId" component={UpgradeRecord}/>

					<Route path="/packageorgs" component={PackageOrgHome}/>
					<Route path="/packageorg/:packageorgId" component={PackageOrgRecord}/>
					<Route path="/admin" component={AdminHome}/>

					<Route path="/login" component={Login}/>
					<Route path="/logout" component={Logout}/>
					<Route path="/authresponse" component={AuthResponse}/>
					<NotificationContainer/>
				</div>
			</Router>
		);
	}
}

export default App;