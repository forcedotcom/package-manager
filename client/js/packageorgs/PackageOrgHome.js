import React from 'react';

import * as packageOrgService from '../services/PackageOrgService';

import {HomeHeader} from '../components/PageHeader';
import PackageOrgList from './PackageOrgList';
// import AuthorizeWindow from '../auth/AuthorizeWindow';
import * as authService from "../services/AuthService";

export default React.createClass({

    getInitialState() {
        return {packageorgs: []};
    },

    componentDidMount() {
        packageOrgService.findAll().then(packageorgs => this.setState({packageorgs}));
    },

    sortHandler(sortOrder) {
        packageOrgService.findAll(sortOrder).then(packageorgs => {
            this.setState({sortOrder, packageorgs});
        });
    },

    newHandler() {
        authService.oauthOrgURL().then(url => this.setState({addingPackageOrg: true, url}));
    },

    deleteHandler(data) {
        packageOrgService.deleteItem(data.id).then(() => {
            packageOrgService.findAll(this.state.sort).then(packageorgs => this.setState({packageorgs}));
        });
    },

    editHandler(data) {
        window.location.hash = "#packageorg/" + data.id + "/edit";
    },

    saveHandler(packageorg) {
        packageOrgService.createItem(packageorg).then(() => {
            packageOrgService.findAll().then(packageorgs => this.setState({addingPackageOrg: false, packageorgs}));
        });
    },

    cancelHandler() {
        this.setState({addingPackageOrg: false});
    },

    viewChangeHandler(value) {
        this.setState({view: value});
    },

    render() {
        return (
            <div>
                <HomeHeader type="package orgs"
                            title="Package Orgs"
                            newLabel="Add Package Org"
                            actions={[{value:"new", label:"Add Package Org"}]}
                            itemCount={this.state.packageorgs.length}
                            viewOptions={[{value:"table", label:"Table", icon:"table"},{value:"tiles", label:"Tiles", icon:"location"}]}
                            sortOptions={[{value:"name", label:"Name"},{value:"namespace", label:"Namespace"}]}
                            onNew={this.newHandler}
                            onSort={this.sortHandler}
                            onViewChange={this.viewChangeHandler}/>
                <PackageOrgList packageorgs={this.state.packageorgs} onSort={this.sortHandler} onDelete={this.deleteHandler} onEdit={this.editHandler}/>
                {this.state.addingPackageOrg && window.open(this.props.url, '', 'width=700,height=700,left=200,top=200')}
                {/*{this.state.addingPackageOrg && (<AuthorizeWindow url={this.state.url}><div>Authorizing</div></AuthorizeWindow>)}*/}
            </div>
        );
    }
});