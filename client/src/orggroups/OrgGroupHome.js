import React from 'react';

import * as orgGroupService from "../services/OrgGroupService";
import * as sortage from '../services/sortage';

import {GroupTypes} from "../Constants";
import {HomeHeader} from "../components/PageHeader";
import OrgGroupList from "./OrgGroupList";
import GroupFormWindow from "./GroupFormWindow";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import * as orgService from "../services/OrgService";

export default class extends React.Component {
	SORTAGE_KEY = "OrgGroupList";
	
	groupTypeMap = new Map(GroupTypes.map(t => [t.name,t]));

	state = {
		sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "name", "asc"),
		orggroups: [],
		selected: new Map(),
		itemCount: "...",
		selectedType: this.groupTypeMap.get(sortage.getSelectedName(this.SORTAGE_KEY, "Upgrade Group"))
	};

	requestData = (pageSize, page, sorted, filtered) => {
		return new Promise((resolve, reject) => {
			orgGroupService.requestAll(this.state.selectedType.name, 
				sorted.length === 0 ? this.state.sortOrder : sortage.changeSortOrder(this.SORTAGE_KEY, sorted[0].id, sorted[0].desc ? "desc" : "asc"), 
				filtered)
			.then(orggroups => {
				this.setState({orggroups, itemCount: orggroups.length});
				// You must return an object containing the rows of the current page, and optionally the total pages number.
				return resolve({
					rows: orggroups.slice(pageSize * page, pageSize * page + pageSize),
					pages: Math.ceil(orggroups.length / pageSize)
				});
			})
			.catch(reject);
		});
	};

	filterHandler = (filtered) => {
		this.setState({itemCount: filtered.length});
	};

	newHandler = () => {
		this.setState({addingOrgGroup: true});
	};

	saveHandler = (orggroup) => {
		orgGroupService.requestCreate(orggroup).then((orggroup) => {
			window.location = `/orggroup/${orggroup.id}`;
		});
	};

	cancelHandler = () => {
		this.setState({addingOrgGroup: false});
	};

	selectionHandler = (selected) => {
		this.setState({selected});
	};
	
	typeSelectionHandler = (selectedType) => {
		sortage.setSelectedName(this.SORTAGE_KEY, selectedType.name);
		orgGroupService.requestAll(selectedType.name, this.state.sortOrder).then(orggroups => this.setState({orggroups, itemCount: orggroups.length}));
		this.setState({selectedType})
	};

	deleteHandler = () => {
		const msg = this.state.selected.size === 1 ?
			`Are you sure you want to delete this group?` :
			`Are you sure you want to delete these ${this.state.selected.size} groups?`
		if (window.confirm(msg)) {
			orgGroupService.requestDelete(Array.from(this.state.selected.keys())).then(() => {
				orgGroupService.requestAll('Upgrade Group', this.state.sortOrder).then(orggroups => this.setState({orggroups}));
			});
		}
	};

	render() {
		const actions = [
			<div key="show" group="types" className="slds-text-title_caps slds-m-right--x-small slds-align_absolute-center">Show:</div>,
			<TypeSelect group="types" key="types" types={GroupTypes} selected={this.state.selectedType} onSelect={this.typeSelectionHandler}/>,
			{label: "New", handler: this.newHandler, detail: "Create new org group"},
			{
				label: "Delete",
				disabled: this.state.selected.size === 0,
				handler: this.deleteHandler,
				detail: "Delete the selected groups"
			}
		];
		return (
			<div>
				<HomeHeader type="org groups" title="Org Groups" itemCount={this.state.itemCount} actions={actions}/>
				<OrgGroupList orggroups={this.state.orggroups} onRequest={this.requestData} onFilter={this.filterHandler}
							  onSelect={this.selectionHandler} selected={this.state.selected} type={this.state.selectedType.name}/>
				<DataTableFilterHelp/>
				{this.state.addingOrgGroup ?
					<GroupFormWindow type={this.state.selectedType.name} onSave={this.saveHandler} onCancel={this.cancelHandler}/> : ""}
			</div>
		);
	}
}

class TypeSelect extends React.Component {
	typeChangeHandler = (e) => {
		this.props.onSelect({name: e.target.id, label: e.target.value});
	};

	render() {
		let options = this.props.types.map(t =>
			<span key={t.name} className="slds-button slds-radio_button">
				<input checked={t.name === this.props.selected.name} type="radio" name="type" id={t.name} value={t.label} onChange={this.typeChangeHandler}/>
				<label className="slds-radio_button__label" htmlFor={t.name}>
					<span className="slds-radio_faux">{t.label}</span>
				</label>
			</span>);

		return (
			<div className="slds-m-right--small slds-radio_button-group">{options}</div>
		);
	}
}
