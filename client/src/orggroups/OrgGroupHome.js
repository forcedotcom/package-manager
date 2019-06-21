import React from 'react';

import * as orgGroupService from "../services/OrgGroupService";
import * as sortage from '../services/sortage';

import {GroupTypes} from "../Constants";
import {HomeHeader} from "../components/PageHeader";
import OrgGroupList from "./OrgGroupList";
import GroupFormWindow from "./GroupFormWindow";
import * as notifier from "../services/notifications";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import * as nav from "../services/nav";
import * as authService from "../services/AuthService";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.groupTypeMap = new Map(GroupTypes.map(t => [t.name, t]));
		this.state = {
			readOnly: authService.getSessionUser().read_only,
			selected: new Map(),
			selectedType: this.groupTypeMap.get(sortage.getSelectedName("OrgGroupList")) || GroupTypes[0]
		};
		
		this.fetchData = this.fetchData.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.selectionHandler = this.selectionHandler.bind(this);
		this.typeSelectionHandler = this.typeSelectionHandler.bind(this);
		this.newHandler = this.newHandler.bind(this);
		this.saveHandler = this.saveHandler.bind(this);
		this.cancelHandler = this.cancelHandler.bind(this);
		this.deleteHandler = this.deleteHandler.bind(this);
	}

	// Lifecycle
	render() {
		const {selected, selectedType, filterColumns, readOnly} = this.state;

		const actions = [
			<DataTableSavedFilters id="OrgGroupList" key="OrgGroupList" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>,
			<TypeSelect group="types" key="types" types={GroupTypes} selected={selectedType} onSelect={this.typeSelectionHandler}/>,
			{label: "New", handler: this.newHandler, disabled: readOnly, detail: "Create new org group"},
			{
				label: "Delete",
				disabled: selected.size === 0 || readOnly,
				handler: this.deleteHandler,
				detail: "Delete the selected groups"
			}
		];
		return (
			<div>
				<HomeHeader type="org groups" title="Org Groups" count={this.state.itemCount} actions={actions}/>
				<OrgGroupList onFetch={this.fetchData} refetchOn="groups" 
							  onFilter={this.filterHandler} filterColumns={filterColumns} 
							  onSelect={readOnly ? null : this.selectionHandler} selected={selected} type={selectedType.name}/>
				{this.state.addingOrgGroup ?
					<GroupFormWindow type={selectedType.name} onSave={this.saveHandler} onCancel={this.cancelHandler}/> : ""}
			</div>
		);
	}
	
	// Handlers
	fetchData() {
		return orgGroupService.requestAll();
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({filtered, itemCount, filterColumns});
	}

	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
	}

	selectionHandler(selected) {
		this.setState({selected});
	}

	typeSelectionHandler(selectedType) {
		sortage.setSelectedName(this.SORTAGE_KEY, selectedType.name);
		this.setState({selectedType});
	}

	newHandler() {
		this.setState({addingOrgGroup: true});
	}

	saveHandler(orggroup) {
		orgGroupService.requestCreate(orggroup).then((orggroup) => {
			nav.toPath("orggroup", orggroup.id);
		});
	}

	cancelHandler() {
		this.setState({addingOrgGroup: false});
	}

	deleteHandler() {
		const msg = this.state.selected.size === 1 ?
			`Are you sure you want to delete this group?` :
			`Are you sure you want to delete these ${this.state.selected.size} groups?`;
		if (window.confirm(msg)) {
			orgGroupService.requestDelete(Array.from(this.state.selected.keys())).then(() => this.state.selected.clear())
			.catch(e => notifier.error(e.message | e, "Fail"));
		}
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

		return ([
				<div key="show" className="slds-text-title_caps slds-m-right--x-small slds-align_absolute-center">Type</div>,
				<div key="types" className="slds-m-right--small slds-radio_button-group">{options}</div>
			]
		);
	}
}
