import React from 'react';

import {CardHeader} from "../components/PageHeader";
import {UPGRADE_JOB_ICON} from "../Constants";
import MessageWindow from "../components/MessageWindow";
import {CSVDownload} from 'react-csv';
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import DataTableSavedFilters from "../components/DataTableSavedFilters";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {done: false};
		
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

		const columns = [
			{Header: "Org Information", columns: [
				{Header: "Org ID", accessor: "org_id", clickable: true, minWidth: 160, filterable: true},
				{
					Header: "Account",
					accessor: "account_name",
					sortable: true,
					clickable: true,
					minWidth: 250,
					filterable: true
				}]
			},
			{Header: "Version Information", columns: [
				{
					Header: "Package Name",
					accessor: "package_name",
					sortable: true,
					clickable: true,
					maxWidth: 200,
					filterable: true
				},
				{
					Header: "Original",
					id: "original_version_sort", accessor: "original_version_number",
					sortable: true,
					clickable: true,
					maxWidth: 100,
					filterable: true
				},
				{
					Header: "Current",
					id: "current_version_sort", accessor: "current_version_number",
					sortable: true,
					clickable: true,
					maxWidth: 100,
					filterable: true
				},
				{
					Header: "Target",
					id: "version_sort", accessor: "version_number",
					sortable: true,
					clickable: true,
					maxWidth: 100,
					filterable: true
				}]
			},
			{Header: "Upgrade Information", columns: [
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
				}]
			}
		];

		const actions = [
			<DataTableSavedFilters id="UpgradeJobCard" key="UpgradeJobCard" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>,
			{label: "Export Results", handler: this.exportHandler}
		];

		return (
			<div className="slds-card">
				<CardHeader title="Upgrade Jobs" icon={UPGRADE_JOB_ICON} count={this.state.itemCount} actions={actions}/>
				<section className="slds-card__body">
					<DataTable id="UpgradeJobCard" columns={columns}
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