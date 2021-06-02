import React from 'react';
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import {Redirect} from "react-router-dom";
import * as nav from "../services/nav";
import moment from "moment";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		
		this.linkHandler = this.linkHandler.bind(this);
	}

	// Lifecycle
	render() {
		if (this.state.goto) {
			return <Redirect to={this.state.goto}/>
		}
		
		let columns = [
			{Header: "Org ID", accessor: "org_id", minWidth: 120, maxWidth: 160, sortable: true, clickable: true},
			{Header: "Name", accessor: "name", sortable: true, clickable: true},
			{Header: "Account", accessor: "account_name", sortable: true, clickable: true},
			{Header: "Instance", accessor: "instance", maxWidth: 70, sortable: true},
			{Header: "Environment", accessor: "org_env", maxWidth: 90, sortable: true},
			{Header: "Location", accessor: "org_location", maxWidth: 70, sortable: true},
			{Header: "Release", accessor: "org_release", maxWidth: 70, sortable: true},
			{Header: "Edition", accessor: "edition", sortable: true},
			{Header: "Groups", accessor: "groups", sortable: true},
			{Header: "Status", accessor: "status", sortable: true},
			{Header: "Last Modified", id: "modified_date", accessor: d => moment(d.modified_date).format("YYYY-MM-DD HH:mm:ss A"), sortable: true}
		];
		return (
			<div className="slds-color__background_gray-1">
				<DataTable id="OrgList" keyField="org_id" columns={columns} 
						 onFetch={this.props.onFetch} fetchName={this.props.fetchName} refetchOn={this.props.refetchOn}
						 onClick={this.linkHandler} onFilter={this.props.onFilter} filters={this.props.filters}
						 showSelected={this.props.showSelected} selection={this.props.selected}
						 onSelect={this.props.onSelect}/>
				<DataTableFilterHelp/>
			</div>
		);
	}
	
	// Handlers
	linkHandler(e, column, rowInfo) {
		// this.setState({goto: "/org/" + rowInfo.row.org_id});
		nav.toPath("org", rowInfo.row.org_id);
	}
}
