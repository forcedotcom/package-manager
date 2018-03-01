import React from 'react';

import DataGrid from '../components/DataGrid';

export default React.createClass({

    linkHandler(orggroup) {
        window.location.hash = "#orggroup/" + orggroup.id;
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
            <DataGrid data={this.props.orggroups} onSort={this.props.onSort} actions={['Edit', 'Delete']} onAction={this.actionHandler}>
                <div header="Name" field="name" sortable="true" onLink={this.linkHandler}/>
                <div header="Description" field="description"/>
            </DataGrid>
        );
    }
});