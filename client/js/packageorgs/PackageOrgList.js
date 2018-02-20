import React from 'react';

import DataGrid from '../components/DataGrid';

export default React.createClass({

    linkHandler(packageorg) {
        window.location.hash = "#packageorg/" + packageorg.id;
    },

    actionHandler(data, value, label) {
        if (label === "Delete") {
            this.props.onDelete(data);
        } else if (label === "Edit") {
            this.props.onEdit(data);
        }
    },

    render() {
        return (
            <DataGrid data={this.props.packageorgs} onSort={this.props.onSort} onAction={this.actionHandler}>
                <div header="Name" field="name" sortable="true" onLink={this.linkHandler}/>
                <div header="Namespace" field="namespace" sortable="true" onLink={this.linkHandler}/>
                <div header="Org ID" field="org_id"/>
                <div header="Username" field="username"/>
                <div header="Instance URL" field="instance_url"/>
                <div header="Status" field="status"/>
            </DataGrid>
        );
    }

});
