import React from 'react';

import * as orgGroupService from "../services/OrgGroupService";
import * as sortage from '../services/sortage';

import {GroupTypes} from "../Constants";
import {HomeHeader} from "../components/PageHeader";
import OrgGroupList from "./OrgGroupList";
import GroupFormWindow from "./GroupFormWindow";
import * as notifier from "../services/notifications";

export default class extends React.Component {
	SORTAGE_KEY = "OrgGroupList";
	constructor() {
		super();
		this.groupTypeMap = new Map(GroupTypes.map(t => [t.name, t]));

		this.state = {
			selected: new Map(),
			selectedType: this.groupTypeMap.get(sortage.getSelectedName(this.SORTAGE_KEY, "Upgrade Group"))
		};
	}

	fetchData = () => {
		return orgGroupService.requestAll();
	};

	filterHandler = (filtered) => {
		this.setState({filtered, itemCount: filtered.length});
	};

	selectionHandler = (selected) => {
		this.setState({selected});
	};

	typeSelectionHandler = (selectedType) => {
		sortage.setSelectedName(this.SORTAGE_KEY, selectedType.name);
		this.setState({selectedType});
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

	deleteHandler = () => {
		const msg = this.state.selected.size === 1 ?
			`Are you sure you want to delete this group?` :
			`Are you sure you want to delete these ${this.state.selected.size} groups?`;
		if (window.confirm(msg)) {
			orgGroupService.requestDelete(Array.from(this.state.selected.keys())).then(() => this.state.selected.clear())
				.catch(e => notifier.error(e.message | e, "Fail"));
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
				<OrgGroupList onFetch={this.fetchData} refetchOn="groups" onFilter={this.filterHandler} onSelect={this.selectionHandler} 
							  selected={this.state.selected} type={this.state.selectedType.name}/>
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
