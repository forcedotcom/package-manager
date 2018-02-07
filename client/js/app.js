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

import PropertyHome from './properties/PropertyHome';
import PropertyRecord from './properties/PropertyRecord';
import PropertyForm from './properties/PropertyForm';
import PropertyView from './properties/PropertyView';

import ContactHome from './contacts/ContactHome';
import ContactRecord from './contacts/ContactRecord';
import ContactForm from './contacts/ContactForm';
import ContactView from './contacts/ContactView';

import BrokerHome from './brokers/BrokerHome';
import BrokerRecord from './brokers/BrokerRecord';
import BrokerForm from './brokers/BrokerForm';
import BrokerView from './brokers/BrokerView';

let App = React.createClass({
    render: function () {
        return (
            <div>
                <header className="menu">
                    <ul className="slds-list--horizontal">
                        <li className="slds-list__item"><IndexLink to="/"><Icon name="account" theme={null}/>Orgs</IndexLink></li>
                        <li className="slds-list__item"><Link to="/licenses"><Icon name="drafts" theme={null}/>Licenses</Link></li>
                        <li className="slds-list__item"><Link to="/packages"><Icon name="thanks" theme={null}/>Packages</Link></li>
                        <li className="slds-list__item"><Link to="/properties"><Icon name="account" theme={null}/>Properties</Link></li>
                        <li className="slds-list__item"><Link to="/contacts"><Icon name="lead" theme={null}/>Contacts</Link></li>
                        <li className="slds-list__item"><Link to="/brokers"><Icon name="people" theme={null}/>Brokers</Link></li>
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

            <Route path="properties" component={PropertyHome}/>
            <Route path="property" component={PropertyRecord}>
                <Route path=":propertyId" component={PropertyView}/>
                <Route path=":propertyId/edit" component={PropertyForm}/>
            </Route>
            <Route path="contacts" component={ContactHome}/>
            <Route path="contact" component={ContactRecord}>
                <Route path=":contactId" component={ContactView}/>
                <Route path=":contactId/edit" component={ContactForm}/>
            </Route>
            <Route path="brokers" component={BrokerHome}/>
            <Route path="broker" component={BrokerRecord}>
                <Route path=":brokerId" component={BrokerView}/>
                <Route path=":brokerId/edit" component={BrokerForm}/>
            </Route>
            <IndexRoute component={OrgHome}/>
        </Route>
    </Router>
), document.getElementById('app'));