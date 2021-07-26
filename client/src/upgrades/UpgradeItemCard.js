import React from 'react';

import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {Colors, getProgressFromUpgradeItem, Status, UPGRADE_ITEM_ICON} from "../Constants";
import DataTable from "../components/DataTable";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import ProgressBar from "../components/ProgressBar";
import {CSVDownload} from "react-csv";
import * as nav from "../services/nav";
import * as strings from "../services/strings";

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
				Header: "Scheduled Start",
				id: "scheduled_start_time",
				accessor: d => moment(d.start_time).format("lll"),
				sortable: true,
				clickable: true
			},
			{Header: "Package Name", accessor: "package_name", sortable: true, clickable: true},
			{Header: "Package Version", id: "version_sort", accessor: "version_number", sortable: true, clickable: true},
			{Header: "Orgs", accessor: "job_count", sortable: true},
			{
				Header: "Start",
				id: "start_time",
				accessor: d => d.start_time ? moment(d.start_time).format("h:mm:ss A") : "",
				sortable: true,
				clickable: true
			},
			{
				Header: "End",
				id: "end_time",
				accessor: d => d.end_time ? moment(d.end_time).format("h:mm:ss A") : "",
				sortable: true,
				clickable: true
			},
			{
				Header: "Duration",
				id: "duration",
				accessor: d => d.duration > 0 ? moment.duration(d.duration, 'seconds').humanize() : "",
				sortable: false,
				clickable: true
			},
			{
				Header: "Status", accessor: "status", sortable: true,
				Cell: row => <ProgressCell status={row.value} progress={getProgressFromUpgradeItem(row.original)} />
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
				return nav.toPath("upgradeitem", rowInfo.original.id);
			case "package_name":
				return nav.toPath("package", rowInfo.original.package_id);
			case "version_sort":
				return nav.toPath("packageversion", rowInfo.original.version_id);
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

class ProgressCell extends React.Component {
	render() {
		let status = this.props.status;
		let progress = this.props.progress;
		let p;
		if (progress.percentageReady < 1) {
			p = <ProgressBar message="Scheduling" height=".25em" colorSuccess={Colors.Neutral} progress={progress.percentageReady}/>;
		} else {
			let plural = strings.pluralizeIt(progress.errors, "failure");
			let message = (progress.count === 0) ? Status.Ineligible :
				progress.done && progress.errors > 0 ? `Complete with ${plural.num} ${plural.str}` : status;
			p = <ProgressBar message={message} height=".25em" progressTotal={progress.count} progressSuccess={progress.percentageSuccess}
							progressWarning={progress.percentageCanceled} progressError={progress.percentageError}/>;
		}
		return (p);
	}
}
