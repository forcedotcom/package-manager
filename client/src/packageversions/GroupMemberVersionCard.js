import React from 'react';
import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {PACKAGE_VERSION_ICON} from "../Constants";
import DataTable from "../components/DataTable";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import * as Utils from "../components/Utils";
import {CSVDownload} from 'react-csv';
import * as nav from "../services/nav";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {};

		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.linkHandler = this.linkHandler.bind(this);
		this.exportHandler = this.exportHandler.bind(this);
	}

	// Lifecycle
	render() {
		const {filterColumns} = this.state;

		const columns = [
			{Header: "Org Information", columns: [
				{Header: "Org ID", accessor: "org_id", minWidth: 120, maxWidth: 160, sortable: true, clickable: true},
				{Header: "Type", accessor: "type", sortable: true},
				{Header: "Edition", accessor: "edition", sortable: true},
				{Header: "Instance", accessor: "instance", maxWidth: 70, sortable: true}]},
			{Header: "Account Information", columns: [
				{Header: "Account Name", accessor: "account_name", clickable: true},
				{Header: "License", accessor: "license_status"},
				{Header: "Install Date", id: "install_date", accessor: d => d.install_date ? moment(d.install_date).format("YYYY-MM-DD hh:mm a") : null, sortable: true},
			]},
			{Header: "Version Information", columns: [
				{Header: "Package", accessor: "package_name", clickable: true},
				{Header: "Version", id: "version_sort", accessor: Utils.renderVersionNumber, sortable: true, clickable: true},
				{Header: "Status", accessor: "status", sortable: true},
				{Header: "Created Date", id: "created_date", accessor: d => moment(d.created_date).format("YYYY-MM-DD hh:mm a"), sortable: true},
				{Header: "Release Date", id: "created_date", accessor: d => moment(d.release_date).format("YYYY-MM-DD hh:mm a"), sortable: true}
				]},
			];

		const actions = [
			<DataTableSavedFilters offset={2} id="GroupMemberVersionCard" key="GroupMemberVersionCard" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
		].concat(this.props.actions);
		actions.push({label: "Export", handler: this.exportHandler});

		return (
			<article className="slds-card">
				<CardHeader title="Installed Versions" icon={PACKAGE_VERSION_ICON} actions={actions} count={this.state.itemCount}/>
				<div className="slds-card__body">
					<DataTable id="GroupMemberVersionCard" keyField="org_id" columns={columns}
								 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn}
								 onClick={this.linkHandler} onFilter={this.filterHandler} filters={filterColumns}
							     selection={this.props.selected} showSelected={this.props.showSelected} onSelect={this.props.onSelect}/>
				</div>
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} separator={"\t"} target="_blank" /> : ""}
				<footer className="slds-card__footer"/>
			</article>
		);
	}

	// Handlers
	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({filtered, itemCount, filterColumns});
	}

	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
	}

	linkHandler(e, column, rowInfo) {
		switch (column.id) {
			case "org_id":
			case "account_name":
				return nav.toPath("org", rowInfo.row.org_id);
			case "package_name":
				return nav.toPath("package", rowInfo.original.package_id);
			case "version_sort":
				return nav.toPath("packageversion", rowInfo.original.latest_version_id);
			default:
		}
	}

	exportHandler() {
		this.setState({isExporting: true, exportable: this.state.filtered});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	}
}
