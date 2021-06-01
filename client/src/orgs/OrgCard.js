import React from 'react';

import * as orgGroupService from '../services/OrgGroupService';
import {CSVDownload} from 'react-csv';

import {CardHeader} from "../components/PageHeader";
import SelectGroupWindow from "./SelectGroupWindow";
import DataTable from "../components/DataTable";
import * as strings from "../services/strings";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import * as nav from "../services/nav";
import * as authService from "../services/AuthService";
import {Messages} from "../Constants";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			withLicenseData: props.withLicenseData,
			user: authService.getSessionUser(this),
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
		const {selected, filterColumns, user} = this.state;
		
		const columns = [
			{Header: "Org ID", accessor: "org_id", minWidth: 120, maxWidth: 160, sortable: true, clickable: true},
			{Header: "Name", accessor: "name", sortable: true, clickable: true},
			{Header: "Account", accessor: "account_name", sortable: true, clickable: true}];
		if (this.state.withLicenseData) {
			columns.push(
				{Header: "Version", id: "version_sort", accessor: "version_number", sortable: true},
				{Header: "License", accessor: "license_status", sortable: true},
			);
		}
		columns.push(
			{Header: "Instance", accessor: "instance", maxWidth: 70, sortable: true},
			{Header: "Environment", accessor: "org_env", maxWidth: 90, sortable: true},
			{Header: "Location", accessor: "org_location", maxWidth: 70, sortable: true},
			{Header: "Edition", accessor: "edition", sortable: true},
			{Header: "Groups", accessor: "groups", sortable: true}
		);

		const actions = [
			<DataTableSavedFilters id={this.props.id} offset={2} key={this.props.id} filterColumns={filterColumns} onSelect={this.applySavedFilter}/>,
			{label: `${selected.size} Selected`, toggled: this.state.showSelected, group: "special", handler: this.handleShowSelected, disabled: selected.size === 0,
				detail: this.state.showSelected ? "Click to show all records" : "Click to show only records you have selected"},
			{label: `Blacklisted`, hidden: !this.props.onFetchBlacklist, toggled: this.state.showBlacklisted, group: "special", handler: this.handleShowBlacklisted,
				detail: this.state.showBlacklisted ? "Click to clear blacklist filter" : "Click to filter by blacklists"},
			{label: "Add To Group", handler: this.openGroupWindow,
				disabled: user.read_only || selected.size === 0,
				detail: user.read_only ? Messages.READ_ONLY_USER : ""
			},
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
					 	onFetch={this.state.showBlacklisted ? this.props.onFetchBlacklist : this.props.onFetch}
						fetchName={this.state.showBlacklisted ? "blacklist" : "data"}
					  	columns={columns} onClick={this.linkHandler} onFilter={this.filterHandler} filters={filterColumns}
						showSelected={this.props.showSelected} selection={selected}
						onSelect={this.selectionHandler}/>
				</div>
				<footer className="slds-card__footer"/>
				{this.state.addingToGroup ? <SelectGroupWindow title={`Add ${strings.pluralizeIt(selected, "org").num} ${strings.pluralizeIt(selected, "org").str} to group`}
															   onAdd={this.addToGroupHandler}
															   onCancel={this.closeGroupWindow}/> : ""}
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} separator={"\t"} target="_blank" /> : ""}

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
		nav.toPath("org", rowInfo.row.org_id);
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
			nav.toPath("orggroup", orggroup.id);
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
