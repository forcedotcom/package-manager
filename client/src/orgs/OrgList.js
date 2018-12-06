import React from 'react';
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import {Redirect} from "react-router-dom";

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
			{Header: "Org ID", accessor: "org_id", sortable: true, clickable: true},
			{Header: "Name", accessor: "name", sortable: true, clickable: true},
			{Header: "Account", accessor: "account_name", sortable: true, clickable: true},
			{Header: "Instance", accessor: "instance", sortable: true},
			{Header: "Edition", accessor: "edition", sortable: true},
			{Header: "Type", accessor: "type", sortable: true},
			{Header: "Features", accessor: "features", sortable: true},
			{Header: "Groups", accessor: "groups", sortable: true},
			{Header: "Status", accessor: "status", sortable: true}
		];
		return (
			<div>
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
		window.location = "/org/" + rowInfo.row.org_id;
	}
}