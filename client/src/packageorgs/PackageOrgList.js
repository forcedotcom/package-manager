import React from 'react';
import DataTable from "../components/DataTable";
import * as nav from "../services/nav";
import {Colors} from "../Constants";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		
		this.linkHandler = this.linkHandler.bind(this);
	}

	// Lifecycle
	render() {
		const columns = [
			{Header: "Name", accessor: "name", minWidth: 160, sortable: true, clickable: true},
			{Header: "Description", accessor: "description", minWidth: 270, clickable: true},
			{Header: "Org ID", accessor: "org_id", minWidth: 120, clickable: true},
			{Header: "Type", accessor: "type"},
			{Header: "Instance URL", minWidth: 200, accessor: "instance_url"},
			{Header: "Package Namespace", accessor: "namespace"},
			{Header: "Instance Name", accessor: "instance_name"},
			{
				Header: "Status",
				minWidth: 100,
				accessor: "status",
				style: {fontWeight: "bold", textTransform: "uppercase"},
				Cell: row => (
					<b style={{filter: "brightness(65%)", color: row.value === "Connected" || row.value === "Unprotected" ? Colors.Success : Colors.Error}}>{row.value}</b>)
			}
		];

		return (
			<DataTable id="PackageOrgList" keyField="org_id" columns={columns}
						 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn}
						 onClick={this.linkHandler} onSelect={this.props.onSelect}/>
		);
	}
	
	// Handlers
	linkHandler(e, column, rowInfo, instance) {
		if (rowInfo.original.status !== "Connected") {
			this.props.onConnect(rowInfo.original.instance_url, rowInfo.original.type);
		} else {
			nav.toPath("packageorg", rowInfo.row.org_id);
		}
	}
}
