import React from 'react';

import * as orgGroupService from '../services/OrgGroupService';
import {CSVDownload} from 'react-csv';

import {CardHeader} from "../components/PageHeader";
import SelectGroupWindow from "./SelectGroupWindow";
import DataTable from "../components/DataTable";
import * as strings from "../services/strings";
import DataTableSavedFilters from "../components/DataTableSavedFilters";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {
			selected: new Map()
		};
		
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.linkHandler = this.linkHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.selectionHandler = this.selectionHandler.bind(this);
		this.handleShowSelected = this.handleShowSelected.bind(this);
		this.handleShowBlacklisted = this.handleShowBlacklisted.bind(this);
		this.removeMembersHandler = this.removeMembersHandler.bind(this);
		this.addToGroupHandler = this.addToGroupHandler.bind(this);
		this.openGroupWindow = this.openGroupWindow.bind(this);
		this.closeGroupWindow = this.closeGroupWindow.bind(this);
		this.exportHandler = this.exportHandler.bind(this);
	}
	
	// Lifecycle
	render() {
		const {selected, filterColumns} = this.state;
		
		const columns = [
			{Header: "Org ID", accessor: "org_id", sortable: true, clickable: true},
			{Header: "Name", accessor: "name", sortable: true, clickable: true},
			{Header: "Account", accessor: "account_name", sortable: true, clickable: true},
			{Header: "Version", id: "version_sort", accessor: "version_number", sortable: true},
			{Header: "License", accessor: "license_status", sortable: true},
			{Header: "Instance", accessor: "instance", sortable: true},
			{Header: "Type", accessor: "type", sortable: true},
			{Header: "Features", accessor: "features", sortable: true},
			{Header: "Groups", accessor: "groups", sortable: true}
		];

		const actions = [
			<DataTableSavedFilters id={this.props.id} key={this.props.id} filterColumns={filterColumns} onSelect={this.applySavedFilter}/>,
			{label: `${selected.size} Selected`, toggled: this.state.showSelected, group: "special", handler: this.handleShowSelected, disabled: selected.size === 0,
				detail: this.state.showSelected ? "Click to show all records" : "Click to show only records you have selected"},
			{label: `Blacklisted`, hidden: !this.props.onFetchBlacklist, toggled: this.state.showBlacklisted, group: "special", handler: this.handleShowBlacklisted,
				detail: this.state.showBlacklisted ? "Click to clear blacklist filter" : "Click to filter by blacklists"},
			{label: "Add To Group", handler: this.openGroupWindow, disabled: selected.size === 0},
			{label: "Export", handler: this.exportHandler}
		];
		if (this.props.onRemove) {
			actions.push({
				label: "Remove Selected Member Orgs",
				handler: this.removeMembersHandler,
				disabled: selected.size === 0
			});
		}

		return (
			<article className="slds-card">
				<CardHeader title={this.props.title} actions={actions} count={this.state.itemCount}/>
				<div className="slds-card__body">
					<DataTable id={this.props.id} keyField="org_id" 
					 	onFetch={this.props.onFetchBlacklist && this.state.showBlacklisted ? this.props.onFetchBlacklist : this.props.onFetch}
					  	columns={columns} onClick={this.linkHandler} onFilter={this.filterHandler} filters={filterColumns}
						showSelected={this.props.showSelected} selection={selected}
						onSelect={this.selectionHandler}/>
				</div>
				<footer className="slds-card__footer"/>
				{this.state.addingToGroup ? <SelectGroupWindow title={`Add ${strings.pluralizeIt(selected, "org").num} ${strings.pluralizeIt(selected, "org").str} to group`}
															   onAdd={this.addToGroupHandler}
															   onCancel={this.closeGroupWindow}/> : ""}
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} target="_blank" /> : ""}

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
		window.location = "/org/" + rowInfo.row.org_id;
	}

	selectionHandler(selected) {
		let showSelected = this.state.showSelected;
		if (selected.size === 0) {
			showSelected = false;
		}
		this.setState({selected, showSelected});
	}

	handleShowSelected() {
		this.setState({showSelected: !this.state.showSelected});
	}
	
	handleShowBlacklisted() {
		this.setState({showBlacklisted: !this.state.showBlacklisted});
	}

	removeMembersHandler() {
		this.props.onRemove(Array.from(this.state.selected.keys()));
	}

	addToGroupHandler(groupId, groupName) {
		this.setState({addingToGroup: false, showSelected: false, showBlacklisted: false});
		orgGroupService.requestAddMembers(groupId, groupName, Array.from(this.state.selected.keys())).then((orggroup) => {
			window.location = `/orggroup/${orggroup.id}`;
		});
	}

	openGroupWindow() {
		this.setState({addingToGroup: true});
	}
	
	closeGroupWindow() {
		this.setState({addingToGroup: false});
	}

	exportHandler() {
		const exportable = this.state.filtered ? this.state.filtered : this.props.orgs;
		this.setState({isExporting: true, exportable});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	}
}