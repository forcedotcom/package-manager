import React from 'react';

import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {UPGRADE_ICON} from "../Constants";
import DataTable from "../components/DataTable";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import {CSVDownload} from "react-csv";
import * as nav from "../services/nav";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {id: props.id || "UpgradeCard"};
		
		this.linkHandler = this.linkHandler.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.exportHandler = this.exportHandler.bind(this);
	}

	// Lifecycle
	render() {
		const {filterColumns} = this.state;

		let columns = [
			{Header: "Number", accessor: "id", minWidth: 60, sortable: true, clickable: true},
			{Header: "Description", accessor: "description", minWidth: 300, clickable: true},
			{
				Header: "Scheduled Start Time",
				maxWidth: 200,
				id: "start_time",
				accessor: d => moment(d.start_time).format("YYYY-MM-DD HH:mm:ss A"),
				sortable: true,
				clickable: true
			},
			{Header: "When", id: "when", accessor: d => moment(d.start_time).fromNow(), clickable: true, sortable: false},
			{Header: "Created By", accessor: "created_by", sortable: true},
			{Header: "Status", accessor: "item_status", sortable: true}
		];

		const actions = [
			<DataTableSavedFilters id={this.state.id} key={this.state.id} filterColumns={filterColumns} onSelect={this.applySavedFilter}/>,
			{label: "Export Results", handler: this.exportHandler}
		];

		return (
			<div className="slds-card">
				<CardHeader title="Upgrades" icon={UPGRADE_ICON} count={this.state.itemCount} actions={actions}>
					{this.props.notes}
				</CardHeader>
				<section className="slds-card__body">
					<DataTable id="UpgradeCard" columns={columns}
								 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn}
								 onClick={this.linkHandler} onFilter={this.filterHandler} filters={filterColumns}
								 onSelect={this.props.onSelect}/>
				</section>
				<footer className="slds-card__footer"/>
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} separator={"\t"} target="_blank" /> : ""}
			</div>
		);
	}
	
	// Handlers
	linkHandler(e, column, rowInfo) {
		if (rowInfo) {
			nav.toPath("upgrade", rowInfo.row.id);
		}
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({filtered, itemCount, filterColumns});
	}

	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
	}

	exportHandler() {
		const exportable = this.state.filtered;
		this.setState({isExporting: true, exportable});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	}
}
