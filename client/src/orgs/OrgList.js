import React from 'react';
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";

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
			<div>
				<DataTable id="OrgList" keyField="org_id" columns={columns} 
						 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn}
						 onClick={this.linkHandler} onFilter={this.props.onFilter}
						 showSelected={this.props.showSelected} selection={this.props.selected}
						 onSelect={this.props.onSelect}/>
				<DataTableFilterHelp/>
			</div>
		);
	}
}