import React from 'react';
import {NotificationManager} from 'react-notifications';
import {CSVDownload} from 'react-csv';

import * as orgService from '../services/OrgService';
import * as orgGroupService from '../services/OrgGroupService';
import * as sortage from '../services/sortage';

import {HomeHeader} from '../components/PageHeader';
import OrgList from './OrgList';
import SelectGroupWindow from "./SelectGroupWindow";
import AddOrgWindow from "../orggroups/AddOrgWindow";

export default class extends React.Component {
	SORTAGE_KEY = "OrgList";

	state = {
		view: "grid",
		sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "account_name", "asc"),
		orgs: [],
		selected: new Map(),		
		showSelected: false
	};

	componentDidMount() {
		orgService.requestAll(this.state.sortOrder)
		.then(orgs => {
			this.setState({orgs, itemCount: orgs.length});
		})
		.catch(err => console.error(err));
	}

	componentWillUnmount() {
	}
	
	sortHandler = (field) => {
		let sortOrder = sortage.changeSortOrder(this.SORTAGE_KEY, field);
		orgService.requestAll(sortOrder).then(orgs => {
			this.setState({sortOrder, orgs})
		});
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

	filterHandler = (filtered) => {
		this.setState({filtered, itemCount: filtered.length});
	};

	saveHandler = (orgIds) => {
		orgService.requestAdd(orgIds).then((orgs) => {
			this.setState({isAdding: false, showSelected: false, orgs, itemCount: orgs.length});
		}).catch(e => console.error(e));
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
			orgService.requestAll(this.state.sortOrder)
			.then(orgs => {
				this.state.selected.clear(); 
				this.setState({showSelected: false, addingToGroup: false, orgs, itemCount: orgs.length});
			})
			.catch(err => console.error(err))
		});
	};

	cancelAddingToGroupHandler = () => {
		this.setState({showAddToGroup: false});
	};

	addingToGroupHandler = () => {
		this.setState({showAddToGroup: true});
	};


	exportHandler = () => {
		const exportable = this.state.filtered ? this.state.filtered.map(v => v._original) : this.state.orgs;
		this.setState({isExporting: true, exportable});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	};
	
	render() {
		const actions = [
			{label: `${this.state.selected.size} Selected`, toggled: this.state.showSelected, group: "selected", handler: this.handleShowSelected, disabled: this.state.selected.size === 0,
				detail: this.state.showSelected ? "Click to show all records" : "Click to show only records you have selected"},
			{label: "Add To Group", group: "selectable", spinning: this.state.addingToGroup, disabled: this.state.selected.size === 0, handler: this.addingToGroupHandler},
			{label: "Import", handler: this.addingHandler},
			{label: "Export", handler: this.exportHandler}
		];

		return (
			<div>
				<HomeHeader type="orgs" title="Orgs" actions={actions} itemCount={this.state.itemCount}/>
				<OrgList selected={this.state.selected} orgs={this.state.showSelected ? Array.from(this.state.selected.values()) : this.state.orgs} onSort={this.sortHandler} onFilter={this.filterHandler} onSelect={this.selectionHandler}/>
				{this.state.showAddToGroup ? <SelectGroupWindow onAdd={this.addToGroup.bind(this)}
															   onCancel={this.cancelAddingToGroupHandler}/> : ""}
				{this.state.isAdding ? <AddOrgWindow onSave={this.saveHandler} onCancel={this.cancelHandler}/> : ""}
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} target="_blank" /> : ""}
			</div>
		);
	}
}