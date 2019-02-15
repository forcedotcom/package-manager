import React from 'react';
import moment from "moment";
import * as nav from "../services/nav";
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import {CardHeader} from "../components/PageHeader";


export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};

		this.linkHandler = this.linkHandler.bind(this);
	}
	
	// Lifecycle
	render() {
		const columns = [
			{Header: "Name", accessor: "name", sortable: true, clickable: true},
			{Header: "Account", accessor: "account_name", sortable: true, clickable: true},
			{Header: "Package", accessor: "package_name", sortable: true, clickable: true},
			{Header: "Version Number", id: "version_sort", accessor: "version_number", sortable: true, clickable: true},
			{Header: "Status", accessor: "status", sortable: true},
			{Header: "Last Modified", id: "modified_date", accessor: d => moment(d.modified_date).format("YYYY-MM-DD HH:mm:ss A"), sortable: true},
			{Header: "Installed On", id: "install_date", accessor: d => moment(d.install_date).format("YYYY-MM-DD"), sortable: true}
		];

		return (
			<article className="slds-card">
				<CardHeader title={this.props.title} count={this.state.itemCount}/>
				<div className="slds-card__body">
					<DataTable id="LicenseList" keyField="sfid" columns={columns} onFetch={this.props.onFetch}
							   onClick={this.linkHandler} onFilter={this.props.onFilter} filters={this.props.filterColumns}/>
					<DataTableFilterHelp/>
				</div>
				<footer className="slds-card__footer"/>
			</article>
		);
	}
	
	// Handlers
	linkHandler(e, column, rowInfo) {
		switch (column.id) {
			case "name":
			case "account_name":
				return nav.toPath("license", rowInfo.original.sfid)
			case "package_name":
				return nav.toPath("package", rowInfo.original.package_id);
			case "version_sort":
				return nav.toPath("packageversion", rowInfo.original.version_id);
			default:
			// Nothing...
		}
	}
}