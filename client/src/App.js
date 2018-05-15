import React, {Component} from 'react';
import {BrowserRouter as Router, Link, Route} from "react-router-dom";
import ReactTooltip from 'react-tooltip';
import {NotificationContainer} from 'react-notifications';

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

import * as authService from "./services/AuthService";

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

class App extends Component {
    state = {};

    componentDidMount() {
        let u = sessionStorage.getItem("user");
        if (!u) {
            authService.requestUser().then(user => {
                sessionStorage.setItem("user", JSON.stringify(user));
                this.setState({...user});
            }).catch(e => this.setState({display_name: "Invalid", username: e.message}));
        } else {
            let user = JSON.parse(u);
            this.setState({username: user.username, display_name: user.display_name});
        }
    }
    
    render() {
        return (
            <Router>
                <div>
                    <header className="menu">
                        <ul className="slds-list--horizontal">
                            <li className="slds-list__item">
                                <Link style={{whiteSpace: "nowrap"}} to="/"><Icon name={ORG_ICON.name} category={ORG_ICON.category}/>Orgs</Link>
                            </li>
                            <li className="slds-list__item">
                                <Link style={{whiteSpace: "nowrap"}} className="slds-nowrap" to="/orggroups"><Icon name={ORG_GROUP_ICON.name} category={ORG_GROUP_ICON.category}/>Org Groups</Link>
                            </li>
                            <li className="slds-list__item">
                                <Link style={{whiteSpace: "nowrap"}} to="/licenses"><Icon name={LICENSE_ICON.name} category={LICENSE_ICON.category}/>Licenses</Link>
                            </li>
                            <li className="slds-list__item">
                                <Link style={{whiteSpace: "nowrap"}} to="/packages"><Icon name={PACKAGE_ICON.name} category={PACKAGE_ICON.category}/>Packages</Link>
                            </li>
                            <li className="slds-list__item">
                                <Link style={{whiteSpace: "nowrap"}} to="/packageorgs"><Icon name={PACKAGE_ORG_ICON.name} category={PACKAGE_ORG_ICON.category}/>Package Orgs</Link>
                            </li>
                            <li className="slds-list__item">
                                <Link style={{whiteSpace: "nowrap"}} to="/upgrades"><Icon name={UPGRADE_ICON.name} category={UPGRADE_ICON.category}/>Upgrades</Link>
                            </li>
                            <li className="slds-list__item">
                                <Link style={{whiteSpace: "nowrap"}} to="/admin"><Icon name={ADMIN_ICON.name} category={ADMIN_ICON.category}/>Administration</Link>
                            </li>
                            <li style={{width: "100%"}}>&nbsp;</li>

                            {this.state.username ? 
                                <li className="slds-list__item">
                                    <Link data-tip data-for="logout" style={{whiteSpace: "nowrap"}} to="/logout"><Icon
                                        name={AUTH_ICON.name}
                                        category={AUTH_ICON.category}/>Logout {this.state.display_name}</Link>
                                    <ReactTooltip id="logout" place="left" delayShow={600}>
                                        Logged in as {this.state.username}
                                    </ReactTooltip>
                                </li> : ""}
                        </ul>
                    </header>

                    <Route exact path="/" component={OrgHome}/>
                    <Route path="/orgs" component={OrgHome}/>
                    <Route path="/org/:orgId" component={OrgRecord}/>

                    <Route path="/licenses" component={LicenseHome}/>
                    <Route path="/license/:licenseId" component={LicenseRecord}/>

                    <Route path="/orggroups" component={OrgGroupHome}/>
                    <Route exact path="/orggroup/:orgGroupId" component={OrgGroupRecord}/>

                    <Route path="/packages" component={PackageHome}/>
                    <Route path="/package/:packageId" component={PackageRecord}/>

                    <Route path="/packageversion/:packageVersionId" component={PackageVersionRecord}/>

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