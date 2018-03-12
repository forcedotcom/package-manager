import React from 'react';

import * as packageOrgService from '../services/PackageOrgService';

import {HomeHeader} from '../components/PageHeader';
import PackageOrgList from './PackageOrgList';
import AuthorizeWindow from '../auth/AuthorizeWindow';
import * as authService from "../services/AuthService";

export default React.createClass({

    getInitialState() {
        return {packageorgs: []};
    },

    componentDidMount() {
        packageOrgService.requestAll().then(packageorgs => this.setState({packageorgs}));
    },

    sortHandler(sortOrder) {
        packageOrgService.requestAll(sortOrder).then(packageorgs => {
            this.setState({sortOrder, packageorgs});
        });
    },

    newHandler() {
        authService.oauthOrgURL().then(url => {
            window.location.href = url;
        });
    },

    deleteHandler(data) {
        packageOrgService.requestDeleteById(data.id).then(() => {
            packageOrgService.requestAll(this.state.sort).then(packageorgs => this.setState({packageorgs}));
        });
    },

    render() {
        return (
            <div>
                <HomeHeader type="package orgs"
                            title="Package Orgs"
                            newLabel="Add Package Org"
                            actions={[{value:"new", label:"Add Package Org"}]}
                            itemCount={this.state.packageorgs.length}
                            viewOptions={[{value:"table", label:"Table", icon:"table"}]}
                            sortOptions={[{value:"name", label:"Name"},{value:"namespace", label:"Namespace"}]}
                            onNew={this.newHandler}
                            onSort={this.sortHandler}/>
                <PackageOrgList packageorgs={this.state.packageorgs} onSort={this.sortHandler} onDelete={this.deleteHandler}/>
            </div>
        );
    }
});