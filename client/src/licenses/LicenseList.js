import React from 'react';
import moment from "moment";
import DataTable from "../components/DataTable";
import * as sortage from "../services/sortage";

export default class extends React.Component {
    linkHandler = (e, column, rowInfo, instance) => {
        switch(column.id) {
            case "name":
            case "account_name":
                window.location = "/license/" + rowInfo.original.sfid;
                break;
            case "package_name":
                window.location = "/package/" + rowInfo.original.package_id;
                break;
            case "version_number":
                window.location = "/packageversion/" + rowInfo.original.version_id;
                break;
            default:
            // Nothing...
        }
    };

    render() {
        let columns = [
            {Header: "Name", accessor: "name", sortable: true, clickable: true},
            {Header: "Account", accessor: "account_name", sortable: true, clickable: true},
            {Header: "Package", accessor: "package_name", sortable: true, clickable: true},
            {Header: "Version Number", accessor: "version_number", sortable: true, clickable: true,
                sortMethod: (a, b) => sortage.getSortableVersion(a) > sortage.getSortableVersion(b) ? 1 : -1},
            {Header: "Type", id: "is_sandbox", accessor: d => d.is_sandbox ? "Sandbox" : "Production", sortable: true},
            {Header: "Last Modified", id: "modified_date", accessor: d => moment(d.modified_date).format("YYYY-MM-DD [at] hh:mm:ss a"), sortable: true},
            {Header: "Installed On", id: "install_date", accessor: d => moment(d.install_date).format("YYYY-MM-DD"), sortable: true}
        ];
        return (
            <DataTable id="LicenseList" data={this.props.licenses} onFilter={this.props.onFilter} onClick={this.linkHandler} columns={columns}/>
        );
    }
}