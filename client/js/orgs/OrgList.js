import React from 'react';
import DataGrid from '../components/DataGrid';

export default React.createClass({

    linkHandler(org) {
        window.location.hash = "#org/" + org.org_id;
    },

    render() {
        return (
            <DataGrid data={this.props.orgs} keyField="id" onSort={this.props.onSort}>
                <div header="Account" field="account_name" sortable={true} onLink={this.linkHandler}/>
                <div header="Org ID" field="org_id" sortable={true}/>
                <div header="Instance" field="instance" sortable={true}/>
                <div header="Type" field="type" sortable={true}/>
                <div header="Status" field="status" sortable={true}/>
                <div header="AOV Band" field="aov_band" sortable={true}/>
            </DataGrid>
        );
    }

});