import React from 'react';
import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {PACKAGE_VERSION_ICON} from "../Constants";
import DataTable from "../components/DataTable";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import * as Utils from "../components/Utils";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {};
		
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.linkHandler = this.linkHandler.bind(this);
	}

	// Lifecycle
	render() {
		const {filterColumns} = this.state;

		const columns = [
			{Header: "Org ID", accessor: "org_id", sortable: true, clickable: true},
			{Header: "Account Name", accessor: "account_name", clickable: true},
			{Header: "Package", accessor: "package_name", clickable: true},
			{Header: "License", accessor: "license_status"},
			{Header: "Version", id: "version_sort", accessor: Utils.renderVersionNumber, sortable: true, clickable: true},
			{Header: "Instance", accessor: "instance", sortable: true},
			{Header: "Type", accessor: "type", sortable: true},
			{Header: "Edition", accessor: "edition", sortable: true},
			{Header: "Status", accessor: "status", sortable: true},
			{Header: "Release Date", id: "release_date", accessor: d => moment(d.release_date).format("YYYY-MM-DD"), sortable: false},
		];

		const actions = [
			<DataTableSavedFilters id="GroupMemberVersionCard" key="GroupMemberVersionCard" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
		].concat(this.props.actions);
		
		return (
			<article className="slds-card">
				<CardHeader title="Installed Versions" icon={PACKAGE_VERSION_ICON} actions={actions} count={this.state.itemCount}/>
				<div className="slds-card__body">
					<DataTable id="GroupMemberVersionCard" keyField="org_id" columns={columns} 
								 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn} 
								 onClick={this.linkHandler} onFilter={this.filterHandler} filters={filterColumns}
							   selection={this.props.selected} onSelect={this.props.onSelect}/>
				</div>
				<footer className="slds-card__footer"/>
			</article>
		);
	}

	// Handlers
	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({itemCount, filterColumns});
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
}