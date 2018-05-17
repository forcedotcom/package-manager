import React from 'react';

import * as packageOrgService from '../services/PackageOrgService';

import {HeaderNote, HomeHeader} from '../components/PageHeader';
import PackageOrgList from './PackageOrgList';
import * as authService from "../services/AuthService";
import * as sortage from "../services/sortage";

export default class extends React.Component {
    SORTAGE_KEY = "PackageOrgList";

    
    state = {packageorgs: [], sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "name", "asc"), selected: []};

    componentDidMount() {
        packageOrgService.requestAll(this.state.sortOrder).then(packageorgs => this.setState({packageorgs}));
    }


    newHandler = (event) => {
        this.connectHandler(event.shiftKey ? "https://test.salesforce.com" : "https://login.salesforce.com");
    };
    
    connectHandler = (instanceUrl) => {
        authService.oauthOrgURL(instanceUrl).then(url => {
            window.open(url, '', 'width=700,height=700,left=200,top=200');
        });
    };

    selectionHandler = (selected) => {
        this.setState({selected});
    };

    refreshHandler = () => {
        let packageorgs = this.state.packageorgs;
        for(let i = 0; i < packageorgs.length; i++) {
            let porg = packageorgs[i];
            if( this.state.selected.indexOf(porg.org_id) !== -1) {
                porg.status = null;
            }
        }
        this.setState({isRefreshing: true, packageorgs});
        
        packageOrgService.requestRefresh(this.state.selected).then(() => {
            packageOrgService.requestAll(this.state.sortOrder).then(packageorgs => this.setState({packageorgs, isRefreshing: false}));
        });
    };

    deleteHandler = () => {
        if (window.confirm(`Are you sure you want to remove ${this.state.selected.length} packaging org(s)?`)) {
            packageOrgService.requestDelete(this.state.selected).then(() => {
                packageOrgService.requestAll(this.state.sortOrder).then(packageorgs => this.setState({packageorgs}));
            });
        }
    };
    
    render() {
        const actions = [
            {label: "Add Package Org", group: "add", detail: "Shift-click to add sandbox org", handler: this.newHandler},
            {label: "Refresh", handler: this.refreshHandler, disabled: this.state.selected.length === 0, spinning: this.state.isRefreshing, detail: "Refresh the access token of the selected org"},
            {label: "Delete", handler: this.deleteHandler, disabled: this.state.selected.length === 0, detail: "Remove the selected org"}
        ];
        
        return (
            <div>
                <HomeHeader type="package orgs"
                            title="Package Orgs"
                            newLabel="Add Package Org"
                            actions={actions}
                            itemCount={this.state.packageorgs.length}>
                    <HeaderNote>Remember that packaging orgs must have the <b>Packaging Push</b> permissions as well as <b>Apex Certified</b> Partner</HeaderNote>
                </HomeHeader>
                <PackageOrgList packageorgs={this.state.packageorgs} onConnect={this.connectHandler} onSelect={this.selectionHandler} onDelete={this.deleteHandler}/>
            </div>
        );
    }
}