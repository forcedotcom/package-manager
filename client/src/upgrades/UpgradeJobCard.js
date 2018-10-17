import React from 'react';

import {CardHeader} from "../components/PageHeader";
import {UPGRADE_JOB_ICON} from "../Constants";
import MessageWindow from "../components/MessageWindow";
import {CSVDownload} from 'react-csv';
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import moment from "moment";

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

		const upgradeInfoColumns = [];
		if (this.state.id === "OrgJobCard") {
			upgradeInfoColumns.push({
				Header: "Start Time",
				id: "start_time",
				accessor: d => moment(d.start_time).format("YYYY-MM-DD HH:mm:ss A"),
				sortable: true,
				clickable: true
			});
		}
		upgradeInfoColumns.push(
			{
				Header: "Status", accessor: "status", sortable: true, filterable: true,
				Cell: row => (
					<div>
							<span data-subject={row.value} data-message={row.original.message}
								  onClick={this.openMessageWindow} style={{
								padding: "2px 10px 2px 10px",
								backgroundColor: row.original.message ? "#C00" : "inherit",
								cursor: row.original.message ? "pointer" : "inherit",
								color: row.original.message ? "white" : "inherit",
								borderRadius: '10px',
								transition: 'all .3s ease-in'
							}}>{row.value}</span>
					</div>
				)
			}
		);
		const columns = [];
		if (this.state.id !== "OrgJobCard") {
			columns.push({
				Header: "Org Information", columns: [
					{Header: "Org ID", accessor: "org_id", clickable: true, minWidth: 160, filterable: true},
					{
						Header: "Account",
						accessor: "account_name",
						sortable: true,
						clickable: true,
						minWidth: 250,
						filterable: true
					}]
			});
		}
		columns.push({Header: "Version Information", columns: [
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
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} target="_blank" /> : ""}
				<DataTableFilterHelp/>
			</div>
		);
	}
	
	// Handlers
	linkHandler(e, column, rowInfo) {
		switch (column.id) {
			case "org_id":
			case "account_name":
				window.location = "/org/" + rowInfo.original.org_id;
				break;
			case "start_time":
				window.location = "/upgrade/" + rowInfo.original.upgrade_id;
				break;
			case "package_name":
				window.location = "/package/" + rowInfo.original.package_id;
				break;
			case "original_version_sort":
				window.location = "/packageversion/" + rowInfo.original.original_version_id;
				break;
			case "current_version_sort":
				window.location = "/packageversion/" + rowInfo.original.current_version_id;
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