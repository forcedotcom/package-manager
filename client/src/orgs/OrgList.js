import React from 'react';
import DataTable from "../components/DataTable";
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
			this.props.showSelected ? 
				<DataTable selection={this.props.selected} keyField="org_id" id="OrgList" onFilter={this.props.onFilter}
						   data={Array.from(this.props.selected.values())}
						   onClick={this.linkHandler} onSelect={this.props.onSelect} columns={columns}/> :
				<ServerTable selection={this.props.selected} keyField="org_id" id="OrgList"
							 data={this.props.orgs}
							 onRequest={this.props.onRequest} onFilter={this.props.onFilter}
							 onClick={this.linkHandler} onSelect={this.props.onSelect}
							 columns={columns}/>
		);
	}
}