import React from 'react';
import {CSVDownload} from 'react-csv';

import * as orgService from '../services/OrgService';
import * as orgGroupService from '../services/OrgGroupService';
import * as notifier from '../services/notifications';

import {HomeHeader} from '../components/PageHeader';
import OrgList from './OrgList';
import SelectGroupWindow from "./SelectGroupWindow";
import AddOrgWindow from "../orggroups/AddOrgWindow";
import * as strings from "../services/strings";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import * as nav from "../services/nav";
import * as authService from "../services/AuthService";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {
			user: authService.getSessionUser(this),
			transid: nav.transid(),
			selected: new Map()
		};
		
		this.fetchData = this.fetchData.bind(this);
		this.fetchBlacklist = this.fetchBlacklist.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.selectionHandler = this.selectionHandler.bind(this);
		this.handleShowSelected = this.handleShowSelected.bind(this);
		this.handleShowBlacklisted = this.handleShowBlacklisted.bind(this);
		this.addOrgHandler = this.addOrgHandler.bind(this);
		this.importHandler = this.importHandler.bind(this);
		this.cancelHandler = this.cancelHandler.bind(this);
		this.addToGroup = this.addToGroup.bind(this);
		this.addingToGroupHandler = this.addingToGroupHandler.bind(this);
		this.cancelAddingToGroupHandler = this.cancelAddingToGroupHandler.bind(this);
		this.exportHandler = this.exportHandler.bind(this);
	}

	// Lifecycle
	componentDidMount() {
		notifier.on('orgs', this.cancelHandler);
	}

	componentWillUnmount() {
		notifier.on('orgs', this.cancelHandler);
	}
	
	render() {
		const {selected, filterColumns, user} = this.state;
		const actions = [
			<DataTableSavedFilters id="OrgList" key="OrgList" offset={3} filterColumns={filterColumns} onSelect={this.applySavedFilter}/>,
			{label: `${selected.size} Selected`, toggled: this.state.showSelected, group: "special", handler: this.handleShowSelected, disabled: selected.size === 0,
				detail: this.state.showSelected ? "Click to show all records" : "Click to show only records you have selected"},
			{label: `Blacklisted`, toggled: this.state.showBlacklisted, group: "special", handler: this.handleShowBlacklisted,
				detail: this.state.showBlacklisted ? "Click to clear blacklist filter" : "Click to filter by blacklists"},
			{label: "Add To Group", group: "selectable", spinning: this.state.addingToGroup, disabled: user.read_only || selected.size === 0, handler: this.addingToGroupHandler},
			{label: "Import", handler: this.importHandler},
			{label: "Export", handler: this.exportHandler}
		];
		return (
			<div>
				<HomeHeader type="orgs" title="Orgs" actions={actions} count={this.state.itemCount}/>
				<OrgList onFetch={this.state.showBlacklisted ? this.fetchBlacklist : this.fetchData} fetchName={this.state.showBlacklisted ? "blacklist" : "data"} 
						 refetchOn="orgs" onFilter={this.filterHandler} filters={filterColumns}
						 showSelected={this.state.showSelected} onSelect={this.selectionHandler} selected={selected} />
				{this.state.showAddToGroup ? <SelectGroupWindow title={`Add ${strings.pluralizeIt(selected, "org").num} ${strings.pluralizeIt(selected, "org").str} to group`} 
																onAdd={this.addToGroup}
															   onCancel={this.cancelAddingToGroupHandler}/> : ""}
				{this.state.showImportWindow ? <AddOrgWindow onSave={this.addOrgHandler} onCancel={this.cancelHandler}/> : ""}
				{this.state.isExporting ? <CSVDownload data={this.state.filtered} separator={"\t"} target="_blank" /> : ""}
			</div>
		);
	}
	
	// Handlers
	fetchData() {
		return orgService.requestAll();
	}

	fetchBlacklist() {
		return orgService.requestAll(true);
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({filtered, itemCount, filterColumns});
	}

	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
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

	addOrgHandler(orgIds) {
		orgService.requestAdd(orgIds, this.state.transid)
		.then(() => this.setState({showSelected: false, showBlacklisted: false}))
		.catch(e => {
			notifier.error(e.message, "Failed to Add Org(s)");
		});
	}

	importHandler() {
		this.setState({showImportWindow: true});
	}

	cancelHandler(res) {
		if (res === this.state.transid) {
			this.setState({showImportWindow: false});
		}
	}

	addToGroup(groupId, groupName) {
		this.setState({showAddToGroup: false, addingToGroup: true});
		orgGroupService.requestAddMembers(groupId, groupName, Array.from(this.state.selected.keys())).then((orggroup) => {
			notifier.success(`Added ${this.state.selected.size} org(s) to ${orggroup.name}`, "Added orgs", 7000, () => nav.toPath("orggroup", orggroup.id));
			this.state.selected.clear();
			this.setState({showSelected: false, showBlacklisted: false, addingToGroup: false});
		});
	}

	addingToGroupHandler() {
		this.setState({showAddToGroup: true});
	}

	cancelAddingToGroupHandler() {
		this.setState({showAddToGroup: false});
	}

	exportHandler() {
		this.setState({isExporting: true});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	}
}