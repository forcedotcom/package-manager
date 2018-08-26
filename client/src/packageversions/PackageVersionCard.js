import React from 'react';

import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {PACKAGE_VERSION_ICON} from "../Constants";
import * as sortage from "../services/sortage";
import DataTable from "../components/DataTable";
import DataTableSavedFilters from "../components/DataTableSavedFilters";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {};
		
		this.linkHandler = this.linkHandler.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
	}

	// Lifecycle
	render() {
		const {filterColumns} = this.state;
		let columns = [
			{
				Header: "Version Number", accessor: "version_number", sortable: true, clickable: true,
				sortMethod: (a, b) => {return sortage.getSortableVersion(a) > sortage.getSortableVersion(b) ? 1 : -1}
			},
			{
				Header: "Release Date",
				id: "release_date",
				accessor: d => moment(d.release_date).format("YYYY-MM-DD"),
				sortable: false
			},
			{Header: "Version ID", accessor: "version_id", sortable: false},
			{Header: "Status", accessor: "status", sortable: true}
		];

		const actions = [
			<DataTableSavedFilters id="PackageVersionCard" key="PackageVersionCard" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
		];
		
		return (
			<div className="slds-card">
				<CardHeader title="Package Versions" icon={PACKAGE_VERSION_ICON} count={this.state.itemCount} actions={actions}/>
				<section className="slds-card__body">
					<DataTable id="PackageVersionCard" columns={columns} onFetch={this.props.onFetch} 
							   onFilter={this.filterHandler} filters={filterColumns} onClick={this.linkHandler} />
				</section>
				<footer className="slds-card__footer"/>
			</div>
		);
	}

	// Handlers
	linkHandler(e, column, rowInfo) {
		window.location = "/packageversion/" + rowInfo.original.version_id;
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({filtered, itemCount, filterColumns});
	}

	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
	}
}