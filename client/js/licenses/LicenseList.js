import React from 'react';
import DataGrid from '../components/DataGrid';

export default React.createClass({

    linkHandler(license) {
        window.location.hash = "#license/" + license.id;
    },

    accountLinkHandler(license) {
        window.location.hash = "#account/" + license.account_id;
    },

    packageLinkHandler(license) {
        window.location.hash = "#package/" + license.package_id;
    },

    packageVersionLinkHandler(license) {
        window.location.hash = "#packageversion/" + license.package_version_id;
    },

    actionHandler(data, value, label) {
        // if (label === "Delete") {
        //     this.props.onDelete(data);
        // } else if (label === "Edit") {
        //     this.props.onEdit(data);
        // }
    },

    render() {
        return (
            <DataGrid data={this.props.licenses} keyField="id" onSort={this.props.onSort} onAction={this.actionHandler}>
                <div header="Name" field="name" sortable={true} onLink={this.linkHandler}/>
                <div header="Account" field="account_name" sortable={true} onLink={this.accountLinkHandler}/>
                <div header="Package" field="package_name" sortable={true} onLink={this.packageLinkHandler}/>
                <div header="Package Version" field="package_version_name" sortable={true} onLink={this.packageVersionLinkHandler}/>
                <div header="Status" field="status" textAlign="center" sortable={true}/>
                <div header="Install Date" field="install_date" sortable={true} format="date"/>
            </DataGrid>
        );
    }

});