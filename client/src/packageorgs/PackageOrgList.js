import React from 'react';

import DataTable from "../components/DataTable";

export default class extends React.Component {
    linkHandler = (e, column, rowInfo, instance) => {
        if (rowInfo.original.status !== "Connected") {
            this.props.onConnect(rowInfo.original.instance_url);           
        } else {
            window.location = "/packageorg/" + rowInfo.row.org_id;
        }
    };

    render() {
        const columns = [
            {Header: "Name", accessor: "name", minWidth: 160, sortable: true, clickable: true},
            {Header: "Instance URL", minWidth: 200, accessor: "instance_url", clickable: true},
            {Header: "Description", accessor: "description", minWidth: 270, clickable: true},
            {Header: "Package Namespace", accessor: "namespace", clickable: true},
            {Header: "Org ID", accessor: "org_id", minWidth: 120, clickable: true},
            {Header: "Instance Name", accessor: "instance_name"},
            {Header: "Status", minWidth: 100, accessor: "status", style: {fontWeight: "bold", textTransform: "uppercase"},
                Cell: row => (<b className={row.value === "Connected" ? "slds-text-color_success" : "slds-text-color_error"}>{row.value}</b>)}
        ];

        return (
            <DataTable keyField="org_id" id="PackageOrgList" data={this.props.packageorgs} onClick={this.linkHandler} onSelect={this.props.onSelect} columns={columns}/>
        );
    }
}
