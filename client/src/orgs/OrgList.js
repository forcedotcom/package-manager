import React from 'react';
import ServerTable from "../components/ServerTable";

export default class extends React.Component {
	linkHandler = (e, column, rowInfo) => {
		window.location = "/org/" + rowInfo.row.org_id;
	};

	render() {
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
			<ServerTable keyField="org_id" id="OrgList" data={this.props.orgs} columns={columns}
						 showSelected={this.props.showSelected} selection={this.props.selected} onSelect={this.props.onSelect}
						 onClick={this.linkHandler} onFilter={this.props.onFilter} onRequest={this.props.onRequest} />
		);
	}
}