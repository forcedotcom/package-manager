import React from 'react';

import * as licenseService from '../services/LicenseService';

import {HomeHeader} from '../components/PageHeader';

import LicenseList from './LicenseList';

export default React.createClass({

    getInitialState() {
        return {view: "grid", sortOrder: "name", licenses: []};
    },
    
    componentDidMount() {
        licenseService.requestAll(this.state.sortOrder).then(licenses=> this.setState({licenses}));
    },

    sortHandler(sortOrder) {
        licenseService.requestAll(sortOrder).then(licenses => {
            this.setState({sortOrder, licenses})
        });
    },

    editHandler(data) {
        window.location.hash = "#license/" + data.id + "/edit";
    },

    viewChangeHandler(value) {
        this.setState({view: value});
    },

    saveHandler(license) {
        licenseService.createItem(license).then(() => {
            licenseService.requestAll(this.state.sort).then(licenses => this.setState({addingLicense: false, licenses}));
        });
    },

    cancelHandler() {
        this.setState({addingLicense: false}); //TODO NUKE THIS ADDING LICENSE BIT
    },

    render() {
        return (
            <div>
                <HomeHeader type="licenses"
                            title="Licenses"
                            actions={[]}
                            itemCount={this.state.licenses.length}
                            viewOptions={[{value:"table", label:"Table", icon:"table"},{value:"map", label:"Map", icon:"location"},{value:"split", label:"Split", icon:"layout"}]}
                            sortOptions={[{value:"name", label:"Name"},{value:"status", label:"Status"},{value:"packageversion", label:"Package Version"}]}
                            onNew={this.newHandler}
                            onSort={this.sortHandler}
                            onViewChange={this.viewChangeHandler}/>
                <LicenseList licenses={this.state.licenses} onSort={this.sortHandler} onEdit={this.editHandler}/>
            </div>
        );
    }

});