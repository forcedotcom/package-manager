import React from 'react';

import * as orgGroupService from '../services/OrgGroupService';
import {CSVDownload} from 'react-csv';

import {CardHeader} from "../components/PageHeader";
import SelectGroupWindow from "./SelectGroupWindow";
import DataTable from "../components/DataTable";
import * as strings from "../services/strings";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {
			selected: new Map(), showSelected: false
		};
	}

	linkHandler = (e, column, rowInfo) => {
		window.location = "/org/" + rowInfo.row.org_id;
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

	removeMembersHandler = () => {
		this.props.onRemove(Array.from(this.state.selected.keys()));
	};

	addToGroupHandler = (groupId, groupName) => {
		this.setState({addingToGroup: false, showSelected: false});
		orgGroupService.requestAddMembers(groupId, groupName, Array.from(this.state.selected.keys())).then((orggroup) => {
			window.location = `/orggroup/${orggroup.id}`;
		});
	};

	closeGroupWindow = () => {
		this.setState({addingToGroup: false});
	};

	openGroupWindow = () => {
		this.setState({addingToGroup: true});
	};

	filterHandler = (filtered) => {
		this.setState({filtered, itemCount: filtered.length});
	};

	exportHandler = () => {
		const exportable = this.state.filtered ? this.state.filtered.map(v => v._original) : this.props.orgs;
		this.setState({isExporting: true, exportable});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	};

	render() {
		const {selected} = this.state;
		
		const columns = [
			{Header: "Org ID", accessor: "org_id", sortable: true, clickable: true},
			{Header: "Name", accessor: "name", sortable: true, clickable: true},
			{Header: "Account", accessor: "account_name", sortable: true, clickable: true},
			{Header: "Version", accessor: "version_number", sortable: true},
			{Header: "License", accessor: "license_status", sortable: true},
			{Header: "Instance", accessor: "instance", sortable: true},
			{Header: "Type", accessor: "type", sortable: true},
			{Header: "Features", accessor: "features", sortable: true},
			{Header: "Groups", accessor: "groups", sortable: true}
		];

		const actions = [
			{label: `${selected.size} Selected`, toggled: this.state.showSelected, group: "selected", handler: this.handleShowSelected, disabled: selected.size === 0,
				detail: this.state.showSelected ? "Click to show all records" : "Click to show only records you have selected"},
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
					<DataTable id="OrgCard" keyField="org_id" columns={columns} onFetch={this.props.onFetch}
								 onClick={this.linkHandler} onFilter={this.filterHandler}
								 showSelected={this.props.showSelected} selection={selected}
								 onSelect={this.selectionHandler}/>
				</div>
				<footer className="slds-card__footer"/>
				{this.state.addingToGroup ? <SelectGroupWindow title={`Add ${strings.pluralizeIt(selected, "org").num} ${strings.pluralizeIt(selected, "org").str} to group`}
															   onAdd={this.addToGroupHandler.bind(this)}
															   onCancel={this.closeGroupWindow}/> : ""}
				{this.state.isExporting ? <CSVDownload data={this.state.exportable} target="_blank" /> : ""}

			</article>
		);
	}
}