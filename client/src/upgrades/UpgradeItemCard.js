import React from 'react';

import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {Status, UPGRADE_ITEM_ICON} from "../Constants";
import DataTable from "../components/DataTable";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import {CSVDownload} from "react-csv";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {id: props.id || "UpgradeItemCard"};
		
		this.linkHandler = this.linkHandler.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.exportHandler = this.exportHandler.bind(this);
	}

	// Lifecycle
	render() {
		const {filterColumns} = this.state;

		let columns = [];
		if (this.state.id !== "UpgradeItemCard") {
			columns.push(
				{Header: "Description", accessor: "description", clickable: true, minWidth: 160, filterable: true}
			);
		}
		columns.push(
			{
				Header: "Scheduled Start Time",
				id: "start_time",
				accessor: d => moment(d.start_time).format("lll"),
				sortable: true,
				clickable: true
			},
			{Header: "Package Name", accessor: "package_name", sortable: true, clickable: true},
			{Header: "Package Version", id: "version_sort", accessor: "version_number", sortable: true, clickable: true},
			{Header: "Orgs", accessor: "job_count", sortable: true},
			{
				Header: "Status", accessor: "status", sortable: true,
				Cell: row => (
					<div>
                    <span style={{
						padding: "2px 10px 2px 10px",
						backgroundColor: row.value === "Failed" ? "#C00" : row.value === "Canceled" || (row.original.job_count !== "0" && row.original.eligible_job_count === "0") ? "#d0a600" : "inherit",
						color: (row.value === "Failed" || (row.original.job_count !== "0" && row.original.eligible_job_count === "0") || row.value === "Canceled") ? "white" : "inherit",
						borderRadius: '10px',
						transition: 'all .3s ease-in'
					}}>
                        {(row.original.job_count !== "0" && row.original.eligible_job_count === "0") ? Status.Ineligible : row.value}
                    </span>
					</div>
				)
			}
		);

		const actions = [
			<DataTableSavedFilters id={this.state.id} key={this.state.id} filterColumns={filterColumns} onSelect={this.applySavedFilter}/>,
			{label: "Export Results", handler: this.exportHandler}
		];

		return (
			<div className="slds-card">
				<CardHeader title="Upgrade Requests" icon={UPGRADE_ITEM_ICON} count={this.state.itemCount} actions={actions}>
					{this.props.notes}
				</CardHeader>
				<section className="slds-card__body">
					<DataTable id="UpgradeItemCard" columns={columns}
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
		switch (column.id) {
			case "description":
			case "start_time":
				window.location = "/upgradeitem/" + rowInfo.original.id;
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