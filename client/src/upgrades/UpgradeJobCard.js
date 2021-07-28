import React from 'react';

import {CardHeader} from "../components/PageHeader";
import {Colors, UPGRADE_JOB_ICON} from "../Constants";
import MessageWindow from "../components/MessageWindow";
import {CSVDownload} from 'react-csv';
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import moment from "moment";
import * as nav from "../services/nav";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {done: false, id: props.id || "UpgradeJobCard"};
		
		this.linkHandler = this.linkHandler.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.openMessageWindow = this.openMessageWindow.bind(this);
		this.closeMessageWindow = this.closeMessageWindow.bind(this);
		this.exportHandler = this.exportHandler.bind(this);
	}

	// Lifecycle
	render() {
		const {filterColumns} = this.state;

		const upgradeInfoColumns = [
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
				accessor: d => d.duration > 0 ? moment.duration(d.duration, 'seconds').asSeconds() + " seconds": "",
				sortable: false,
				clickable: true
			},
			{
				Header: "Status", accessor: "status", maxWidth: 90, sortable: true, filterable: true,
				Cell: row => (
					<div style={{
						textAlign: "center", 
						color: row.original.message ? Colors.Error : "inherit",
						fontWeight: row.original.message ? "bold" : "inherit"
					}}>{row.value}</div>)
			},
			{
				Header: "Message", maxWidth: 90, accessor: "message", sortable: true, filterable: true,
				Cell: row => (
					<div className="slds-text-align--center">
							<span data-subject={row.original.status} data-message={row.value}
								  onClick={this.openMessageWindow} style={{
								padding: "2px 10px 2px 10px",
								backgroundColor: row.original.message ? Colors.Error : "inherit",
								cursor: row.original.message ? "pointer" : "inherit",
								color: row.original.message ? "white" : "inherit",
								borderRadius: '10px'
							}}>{!row.value || 'Error'}</span>
					</div>
				)
			}
		];
		const columns = [];
		if (this.state.id !== "OrgJobCard") {
			columns.push({
				Header: "Org Information", columns: [
					{Header: "Org ID", accessor: "org_id", clickable: true, minWidth: 120, maxWidth: 160, filterable: true},
					{Header: "Instance", accessor: "instance", filterable: true, maxWidth: 70},
					{Header: "Environment", accessor: "environment", maxWidth: 90, filterable: true, sortable: true},
					{Header: "Location", accessor: "location", maxWidth: 70, filterable: true, sortable: true},
					{
						Header: "Account",
						accessor: "account_name",
						sortable: true,
						clickable: true,
						minWidth: 250,
						filterable: true
					},
					{
						Header: "Date Installed",
						id: "install_date",
						accessor: d => moment(d.modified_date).format("YYYY-MM-DD HH:mm:ss A"),
						minWidth: 120,
						sortable: true,
						filterable: true
					}]
			});
		}
		columns.push(
			{Header: "Version Information", columns: [
				{
					Header: "Package Name",
					accessor: "package_name",
					sortable: true,
					clickable: true,
					minWidth: 200,
					filterable: true
				},
					{
					Header: "Original",
					id: "original_version_sort", accessor: "original_version_number",
					sortable: true,
					clickable: true,
					filterable: true
				},
				{
					Header: "Current",
					id: "current_version_sort", accessor: "current_version_number",
					sortable: true,
					clickable: true,
					filterable: true
				},
				{
					Header: "Target",
					id: "version_sort", accessor: "version_number",
					sortable: true,
					clickable: true,
					filterable: true
				}]
			});
		columns.push({Header: "Upgrade Information", columns: upgradeInfoColumns});

		const actions = [
			<DataTableSavedFilters id={this.state.id} key={this.state.id} filterColumns={filterColumns} onSelect={this.applySavedFilter}/>,
			{label: "Export Results", handler: this.exportHandler}
		];

		return (
			<div className="slds-card">
				<CardHeader title="Upgrade Jobs" icon={UPGRADE_JOB_ICON} count={this.state.itemCount} actions={actions}/>
				<section className="slds-card__body">
					<DataTable id={this.state.id} columns={columns}
								 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn} 
								 onClick={this.linkHandler} onFilter={this.filterHandler} filters={filterColumns}/>
				</section>
				<footer className="slds-card__footer"/>
				{this.state.showMessage ?
					<MessageWindow subject={this.state.messageSubject} message={this.state.messageDetail}
								   onClose={this.closeMessageWindow}/> : ""}
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} separator={"\t"} target="_blank" /> : ""}
				<DataTableFilterHelp/>
			</div>
		);
	}
	
	// Handlers
	linkHandler(e, column, rowInfo) {
		switch (column.id) {
			case "org_id":
			case "instance":
			case "account_name":
				return nav.toPath("org", rowInfo.original.org_id);
			case "start_time":
				return nav.toPath("upgrade", rowInfo.original.upgrade_id);
			case "package_name":
				return nav.toPath("package", rowInfo.original.package_id);
			case "original_version_sort":
				return nav.toPath("packageversion", rowInfo.original.original_version_id);
			case "current_version_sort":
				return nav.toPath("packageversion", rowInfo.original.current_version_id);
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

	openMessageWindow(event) {
		const msg = event.target.getAttribute("data-message");
		if (msg) {
			const subj = event.target.getAttribute("data-subject");
			this.setState({showMessage: true, messageSubject: subj, messageDetail: msg});
		}
	}

	closeMessageWindow() {
		this.setState({showMessage: null});
	}

	exportHandler() {
		const exportable = this.state.filtered ? this.state.filtered : this.props.jobs;
		this.setState({isExporting: true, exportable});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	}
}
