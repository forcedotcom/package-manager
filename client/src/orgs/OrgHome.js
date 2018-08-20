import React from 'react';
import {NotificationManager} from 'react-notifications';
import {CSVDownload} from 'react-csv';

import * as orgService from '../services/OrgService';
import * as orgGroupService from '../services/OrgGroupService';

import {HomeHeader} from '../components/PageHeader';
import OrgList from './OrgList';
import SelectGroupWindow from "./SelectGroupWindow";
import AddOrgWindow from "../orggroups/AddOrgWindow";
import * as strings from "../services/strings";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {
			selected: new Map()
		};
	}

	fetchData = () => {
		return orgService.requestAll();
	};
	
	filterHandler = (filtered) => {
		this.setState({filtered, itemCount: filtered.length});
	};

	selectionHandler = (selected) => {
		let showSelected = this.state.showSelected;
		if (selected.size === 0) {
			showSelected = false;
		}
		this.setState({selected, showSelected});
	};

	handleShowSelected = () => {
		this.setState({showSelected: !this.state.showSelected});
	};
	
	saveHandler = (orgIds) => {
		orgService.requestAdd(orgIds)
			.then(() => this.setState({isAdding: false, showSelected: false}))
			.catch(e => console.error(e));
	};

	addingHandler = () => {
		this.setState({isAdding: true});
	};

	cancelHandler = () => {
		this.setState({isAdding: false});
	};

	addToGroup = (groupId, groupName) => {
		this.setState({showAddToGroup: false, addingToGroup: true});
		orgGroupService.requestAddMembers(groupId, groupName, Array.from(this.state.selected.keys())).then((orggroup) => {
			NotificationManager.success(`Added ${this.state.selected.size} org(s) to ${orggroup.name}`, "Added orgs", 7000, () => window.location = `/orggroup/${orggroup.id}`);
			this.state.selected.clear(); 
			this.setState({showSelected: false, addingToGroup: false});
		});
	};

	cancelAddingToGroupHandler = () => {
		this.setState({showAddToGroup: false});
	};

	addingToGroupHandler = () => {
		this.setState({showAddToGroup: true});
	};

	exportHandler = () => {
		this.setState({isExporting: true});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	};
	
	render() {
		const {selected} = this.state;
		const actions = [
			{label: `${selected.size} Selected`, toggled: this.state.showSelected, group: "selected", handler: this.handleShowSelected, disabled: selected.size === 0,
				detail: this.state.showSelected ? "Click to show all records" : "Click to show only records you have selected"},
			{label: "Add To Group", group: "selectable", spinning: this.state.addingToGroup, disabled: selected.size === 0, handler: this.addingToGroupHandler},
			{label: "Import", handler: this.addingHandler},
			{label: "Export", handler: this.exportHandler}
		];
		return (
			<div>
				<HomeHeader type="orgs" title="Orgs" actions={actions} itemCount={this.state.itemCount}/>
				<OrgList onFetch={this.fetchData} refetchOn="orgs" onFilter={this.filterHandler} 
						 showSelected={this.state.showSelected} onSelect={this.selectionHandler} selected={selected} />
				{this.state.showAddToGroup ? <SelectGroupWindow title={`Add ${strings.pluralizeIt(selected, "org").num} ${strings.pluralizeIt(selected, "org").str} to group`} 
																onAdd={this.addToGroup.bind(this)}
															   onCancel={this.cancelAddingToGroupHandler}/> : ""}
				{this.state.isAdding ? <AddOrgWindow onSave={this.saveHandler} onCancel={this.cancelHandler}/> : ""}
				{this.state.isExporting ? <CSVDownload data={this.state.filtered} target="_blank" /> : ""}
			</div>
		);
	}
}