import React from 'react';
import moment from "moment";
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		
		this.linkHandler = this.linkHandler.bind(this);
	}

	// Lifecycle
	render() {
		let columns = [
			{Header: "Name", accessor: "name", sortable: true, clickable: true},
			{Header: "Account", accessor: "account_name", sortable: true, clickable: true},
			{Header: "Package", accessor: "package_name", sortable: true, clickable: true},
			{Header: "Version Number", id: "version_sort", accessor: "version_number", sortable: true, clickable: true},
			{Header: "Is Sandbox", id: "is_sandbox", accessor: d => d.is_sandbox ? "Yes" : "No", filterable: false, sortable: true},
			{Header: "Last Modified", id: "modified_date", accessor: d => moment(d.modified_date).format("YYYY-MM-DD HH:mm:ss A"), sortable: true},
			{Header: "Installed On", id: "install_date", accessor: d => moment(d.install_date).format("YYYY-MM-DD"), sortable: true}
		];
		return (
			<div>
				<DataTable id="LicenseList" keyField="sfid" columns={columns} onFetch={this.props.onFetch}
						 onClick={this.linkHandler} onFilter={this.props.onFilter} filters={this.props.filterColumns}/>
				<DataTableFilterHelp/>
			</div>
		);
	}
	
	// Handlers
	linkHandler(e, column, rowInfo) {
		switch (column.id) {
			case "name":
			case "account_name":
				window.location = "/license/" + rowInfo.original.sfid;
				break;
			case "package_name":
				window.location = "/package/" + rowInfo.original.package_id;
				break;
			case "version_sort":
				window.location = "/packageversion/" + rowInfo.original.version_id;
				break;
			default:
			// Nothing...
		}
	}
}