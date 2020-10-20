import React from 'react';
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import * as nav from "../services/nav";

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
			{Header: "ID", accessor: "sfid", sortable: true, clickable: true},
			{Header: "Packaging Org ID", accessor: "package_org_id", clickable: true},
			{Header: "Packaging ID", accessor: "package_id"},
			{Header: "Tier", accessor: "dependency_tier"},
			{Header: "Status", accessor: "status"}
		];

		return (
			<div className="slds-color__background_gray-1">
				<DataTable id="PackageList" onFetch={this.props.onFetch} onFilter={this.props.onFilter}
					   onClick={this.linkHandler} columns={columns}/>
				<DataTableFilterHelp/>
			</div>
		);
	}
	
	// Handlers
	linkHandler(e, column, rowInfo) {
		switch (column.id) {
			case "name":
			case "ID":
				nav.toPath("package", rowInfo.row.sfid);
				break;
			case "package_org_id":
				nav.toPath("packageorg", rowInfo.row.package_org_id);
				break;
			default:
		}
	}
}
