import React from 'react';
import {render} from 'react-dom';
import {Router, Route, IndexRoute, Link, IndexLink} from 'react-router';

import {Icon} from './components/Icons';


import LicenseHome from './licenses/LicenseHome';
import LicenseRecord from './licenses/LicenseRecord';
import LicenseView from './licenses/LicenseView';

import OrgHome from './orgs/OrgHome';
import OrgRecord from './orgs/OrgRecord';
import OrgView from './orgs/OrgView';

import PackageHome from './packages/PackageHome';
import PackageRecord from './packages/PackageRecord';
import PackageView from './packages/PackageView';

import PackageOrgHome from './packageorgs/PackageOrgHome';
import PackageOrgRecord from './packageorgs/PackageOrgRecord';
import PackageOrgForm from './packageorgs/PackageOrgForm';
import PackageOrgView from './packageorgs/PackageOrgView';

let App = React.createClass({
    render: function () {
        return (
            <div>
                <header className="menu">
                    <ul className="slds-list--horizontal">
                        <li className="slds-list__item"><IndexLink to="/"><Icon name="account" theme={null}/>Orgs</IndexLink></li>
                        <li className="slds-list__item"><Link to="/licenses"><Icon name="drafts" theme={null}/>Licenses</Link></li>
                        <li className="slds-list__item"><Link to="/packages"><Icon name="thanks" theme={null}/>Packages</Link></li>
                        <li className="slds-list__item"><Link to="/packageorgs"><Icon name="people" theme={null}/>Package Orgs</Link></li>
                    </ul>
                </header>
                {this.props.children}
            </div>
        );
    }
});

render((
    <Router>
        <Route name="app" path="/" component={App}>
            <Route path="licenses" component={LicenseHome}/>
            <Route path="license" component={LicenseRecord}>
                <Route path=":licenseId" component={LicenseView}/>
            </Route>
            <Route path="orgs" component={OrgHome}/>
            <Route path="org" component={OrgRecord}>
                <Route path=":orgId" component={OrgView}/>
            </Route>
            <Route path="packages" component={PackageHome}/>
            <Route path="package" component={PackageRecord}>
                <Route path=":packageId" component={PackageView}/>
            </Route>
            <Route path="packageorgs" component={PackageOrgHome}/>
            <Route path="packageorg" component={PackageOrgRecord}>
                <Route path=":orgId" component={PackageOrgView}/>
                <Route path=":orgId/edit" component={PackageOrgForm}/>
            </Route>
            <IndexRoute component={OrgHome}/>
        </Route>
    </Router>
), document.getElementById('app'));
