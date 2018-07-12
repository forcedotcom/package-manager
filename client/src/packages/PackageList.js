import React from 'react';
import DataTable from "../components/DataTable";

export default class extends React.Component {

	linkHandler = (e, column, rowInfo) => {
		switch (column.id) {
			case "name":
			case "ID":
				window.location = "/package/" + rowInfo.row.sfid;
				break;
			case "package_org_id":
				window.location = "/packageorg/" + rowInfo.row.package_org_id;
				break;
			default:
		}

	};

	render() {
		let columns = [
			{Header: "Name", accessor: "name", sortable: true, clickable: true},
			{Header: "ID", accessor: "sfid", sortable: true, clickable: true},
			{Header: "Packaging Org ID", accessor: "package_org_id", clickable: true},
			{Header: "Packaging ID", accessor: "package_id"},
			{Header: "Tier", accessor: "dependency_tier"}
		];

		return (
			<DataTable id="PackageList" data={this.props.packages} onFilter={this.props.onFilter}
					   onClick={this.linkHandler} columns={columns}/>
		);
	}
}