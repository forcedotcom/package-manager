import React from 'react';

import * as orgGroupService from '../services/OrgGroupService';

import {CardHeader} from "../components/PageHeader";
import DataTable from "../components/DataTable";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import * as nav from "../services/nav";
import * as authService from "../services/AuthService";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			user: authService.getSessionUser(this),
			selected: new Map()
		};
		
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.linkHandler = this.linkHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.selectionHandler = this.selectionHandler.bind(this);
		this.handleShowSelected = this.handleShowSelected.bind(this);
		this.removeMembersHandler = this.removeMembersHandler.bind(this);
	}
	
	// Lifecycle
	render() {
		const {selected, showSelected, filterColumns, user} = this.state;
		
		const columns = [
			{Header: "Name", accessor: "name", sortable: true, clickable: true}];

		const actions = [
			<DataTableSavedFilters id={this.props.id} offset={2} key={this.props.id} filterColumns={filterColumns} onSelect={this.applySavedFilter}/>,
			{label: `${selected.size} Selected`, toggled: showSelected, group: "special", handler: this.handleShowSelected, disabled: selected.size === 0,
				detail: showSelected ? "Click to show all records" : "Click to show only records you have selected"},
			{label: "Remove From Selected Groups", handler: this.removeMembersHandler, disabled: selected.size === 0}
		];

		return (
			<article className="slds-card">
				<CardHeader title={this.props.title} actions={actions} count={this.state.itemCount}/>
				<div className="slds-card__body">
					<DataTable id={this.props.id} keyField="id"
					 	onFetch={this.props.onFetch} refetchOn={this.props.refetchOn}
					  	columns={columns} onClick={this.linkHandler} onFilter={this.filterHandler} filters={filterColumns}
						showSelected={showSelected} selection={selected}
						onSelect={this.selectionHandler}/>
				</div>
				<footer className="slds-card__footer"/>
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
		nav.toPath("orggroup", rowInfo.original.id);
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

	removeMembersHandler() {
		this.props.onRemove(Array.from(this.state.selected.keys()));
	}
}
