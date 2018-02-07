import React from 'react';

import * as orgService from '../services/OrgService';

import {HomeHeader} from '../components/PageHeader';

import OrgList from './OrgList';

export default React.createClass({

    getInitialState() {
        return {view: "grid", sortOrder: "account_name", orgs: []};
    },
    
    componentDidMount() {
        orgService.findAll(this.state.sortOrder).then(orgs => {this.setState({orgs})});
    },

    sortHandler(sortOrder) {
        orgService.findAll(sortOrder).then(orgs => {
            this.setState({sortOrder, orgs})
        });
    },

    viewChangeHandler(value) {
        this.setState({view: value});
    },

    cancelHandler() {
        this.setState({});
    },

    render() {
        let view;
        if (this.state.view === "split") {
            view = <div className="slds-grid slds-wrap">
                <div className="slds-col slds-size--1-of-1 slds-large-size--2-of-3">
                    <OrgList orgs={this.state.orgs} onSortChange={this.sortChangeHandler} onEdit={this.editHandler}/>
                </div>
                <div className="slds-col--padded slds-size--1-of-1 slds-large-size--1-of-3">
                    <GoogleMaps data={this.state.orgs}/>
                </div>
            </div>;
        } else {
            view = <OrgList orgs={this.state.orgs} onSort={this.sortHandler} onEdit={this.editHandler}/>;
        }
        return (
            <div>
                <HomeHeader type="orgs"
                            title="Orgs"
                            actions={[]}
                            itemCount={this.state.orgs.length}
                            viewOptions={[{value:"table", label:"Table", icon:"table"},{value:"split", label:"Split", icon:"layout"}]}
                            sortOptions={[{value:"account_name", label:"Account"}]}
                            onSort={this.sortHandler}
                            onViewChange={this.viewChangeHandler}/>
                {view}
            </div>
        );
    }

});