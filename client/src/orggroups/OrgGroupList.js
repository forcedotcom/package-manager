import React from 'react';
import DataTable from "../components/DataTable";

export default class extends React.Component {
    state = {
        selected: []
    };

    linkHandler = (e, column, rowInfo, instance) => {
        window.location = "/orggroup/" + rowInfo.original.id;
    };

    render() {
        const columns = [
            {Header: "Name", accessor: "name", sortable: true, clickable: true},
            {Header: "Description", accessor: "description", clickable: true}
        ];
        return (
            <DataTable id="OrgGroupList" data={this.props.orggroups} onClick={this.linkHandler} onFilter={this.props.onFilter} onSelect={this.props.onSelect} columns={columns}/>
        );
    }
}