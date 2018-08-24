import React from 'react';

import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {PACKAGE_VERSION_ICON} from "../Constants";
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {};
	}


	linkHandler = (e, column, rowInfo) => {
		switch (column.id) {
			case "package_name":
				window.location = "/package/" + rowInfo.original.package_id;
				break;
			case "version_number":
				window.location = "/packageversion/" + rowInfo.original.latest_version_id;
				break;
			default:
		}
	};

	filterHandler = (filtered, filterColumns, itemCount) => {
		this.setState({itemCount});
	};

	render() {
		let columns = [
			{Header: "Package", accessor: "package_name", sortable: true, clickable: true},
			{Header: "License", accessor: "license_status", sortable: true},
			{Header: "Version Number", minWidth: 170, id: "version_number", accessor: this.renderVersionNumber, sortable: true, clickable: true},
			{Header: "Status", accessor: "status", sortable: true},
			{Header: "Release Date", id: "release_date", accessor: d => moment(d.release_date).format("YYYY-MM-DD"), sortable: false}
		];

		return (
			<div className="slds-card">
				<CardHeader title="Installed Versions" icon={PACKAGE_VERSION_ICON} count={this.state.itemCount}/>
				<section className="slds-card__body">
					<DataTable id="InstalledVersionCard" columns={columns}
								 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn}
								 onFilter={this.filterHandler} onClick={this.linkHandler}/>
					<DataTableFilterHelp/>
				</section>
				<footer className="slds-card__footer"/>
			</div>
		);
	}

	renderVersionNumber(d) {
		if (d.version_sort === d.latest_limited_version_sort)
			return d.version_number;

		if (d.version_sort >= d.latest_version_sort)
			return d.version_number;

		return <span title="An upgrade to a newer version is available for this org" style={{borderRadius: "4px", margin: 0, fontWeight: "bold", padding: "2px 4px 2px 4px"}}
					 className="slds-theme--success">{d.version_number} =&gt; {d.latest_version_number}</span>;
	}
}