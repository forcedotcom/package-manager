import React from 'react';
import DataGrid from '../components/DataGrid';

export default React.createClass({

    linkHandler(org) {
        window.location.hash = "#org/" + org.id;
    },

    accountLinkHandler(org) {
        window.location.hash = "#account/" + org.account_id;
    },


    actionHandler(data, value, label) {
    },

    render() {
        return (
            <DataGrid data={this.props.orgs} keyField="id" onSort={this.props.onSort} onAction={this.actionHandler}>
                <div header="ID" field="id" onLink={this.linkHandler}/>
                <div header="Account" field="account_name" sortable={true} onLink={this.accountLinkHandler}/>
                <div header="Instance" field="instance" sortable={true} />
            </DataGrid>
        );
    }

});