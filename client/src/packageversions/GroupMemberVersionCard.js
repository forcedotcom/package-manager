import React from 'react';
import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {PACKAGE_VERSION_ICON} from "../Constants";
import DataTable from "../components/DataTable";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import * as Utils from "../components/Utils";
import {CSVDownload} from 'react-csv';

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
				{Header: "Org ID", accessor: "org_id", sortable: true, clickable: true},
				{Header: "Type", accessor: "type", sortable: true},
				{Header: "Edition", accessor: "edition", sortable: true},
				{Header: "Instance", accessor: "instance", sortable: true}]},
			{Header: "Account Information", columns: [
				{Header: "Account Name", accessor: "account_name", clickable: true},
				{Header: "License", accessor: "license_status"},
				{Header: "Install Date", id: "install_date", accessor: d => moment(d.install_date).format("YYYY-MM-DD"), sortable: false},
			]},
			{Header: "Version Information", columns: [
				{Header: "Package", accessor: "package_name", clickable: true},
				{Header: "Version", id: "version_sort", accessor: Utils.renderVersionNumber, sortable: true, clickable: true},
				{Header: "Status", accessor: "status", sortable: true},
				{Header: "Release Date", id: "release_date", accessor: d => moment(d.release_date).format("YYYY-MM-DD"), sortable: false}]},
			];

		const actions = [
			<DataTableSavedFilters id="GroupMemberVersionCard" key="GroupMemberVersionCard" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
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
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} target="_blank" /> : ""}
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
				window.location = "/org/" + rowInfo.row.org_id;
				break;
			case "package_name":
				window.location = "/package/" + rowInfo.original.package_id;
				break;
			case "version_sort":
				window.location = "/packageversion/" + rowInfo.original.latest_version_id;
				break;
			default:
		}
	}

	exportHandler() {
		this.setState({isExporting: true, exportable: this.state.filtered});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	}
}