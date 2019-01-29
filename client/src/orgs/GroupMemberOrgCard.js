import React from 'react';

import {CardHeader} from "../components/PageHeader";
import {ORG_ICON} from "../Constants";
import DataTable from "../components/DataTable";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import {CSVDownload} from 'react-csv';
import * as nav from "../services/nav";


export default class extends React.Component {
	constructor(props) {
		super(props);

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
			{Header: "Org ID", accessor: "org_id", sortable: true, clickable: true},
			{Header: "Name", accessor: "name", sortable: true, clickable: true},
			{Header: "Account", accessor: "account_name", sortable: true, clickable: true},
			{Header: "Instance", accessor: "instance", sortable: true},
			{Header: "Type", accessor: "type", sortable: true},
			{Header: "Edition", accessor: "edition", sortable: true},
			{Header: "Groups", accessor: "groups", sortable: true},
			{Header: "Status", accessor: "status", sortable: true}
		];

		const actions = [
			<DataTableSavedFilters id="GroupMemberOrgCard" key="GroupMemberOrgCard" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
		].concat(this.props.actions);
		actions.push({label: "Export", handler: this.exportHandler});
		
		return (
			<article className="slds-card">
				<CardHeader title="Members" icon={ORG_ICON} actions={actions} count={this.state.itemCount}/>
				<div className="slds-card__body">
					<DataTable id="GroupMemberOrgCard" keyField="org_id" columns={columns}
								 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn}
								 onClick={this.linkHandler} onFilter={this.filterHandler} filters={filterColumns}
								 selection={this.props.selected} showSelected={this.props.showSelected} onSelect={this.props.onSelect}/>
				</div>
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} separator={"\t"} target="_blank" /> : ""}
				<footer className="slds-card__footer"/>
			</article>
		);
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({filtered, itemCount, filterColumns});
	}

	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
	}

	linkHandler(e, column, rowInfo) {
		nav.toPath("org", rowInfo.row.org_id);
	}

	exportHandler() {
		this.setState({isExporting: true, exportable: this.state.filtered});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	}
}