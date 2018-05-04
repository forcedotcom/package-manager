import React from 'react';

import DataTable from "../components/DataTable";

export default class extends React.Component {
    linkHandler = (e, column, rowInfo, instance) => {
        window.location = "/packageorg/" + rowInfo.row.org_id;
    };

    render() {
        const columns = [
            {Header: "Name", accessor: "name", minWidth: 200, sortable: true, clickable: true},
            {Header: "Division", accessor: "division"},
            {Header: "Namespace", accessor: "namespace"},
            {Header: "Org ID", accessor: "org_id", minWidth: 150},
            {Header: "Instance Name", accessor: "instance_name"},
            {Header: "Instance URL", minWidth: 270, accessor: "instance_url"},
        ];

        return (
            <DataTable keyField="org_id" id="PackageOrgList" data={this.props.packageorgs} onClick={this.linkHandler} onSelect={this.props.onSelect} columns={columns}/>
        );
    }
}
