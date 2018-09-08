import React from 'react';

import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {PACKAGE_VERSION_ICON} from "../Constants";
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import * as Utils from "../components/Utils";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {};
	
		this.linkHandler = this.linkHandler.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
	}

	// Lifecycle
	render() {
		let columns = [
			{Header: "Org Information", columns: [
				{Header: "Package", accessor: "package_name", sortable: true, clickable: true},
				{Header: "License", accessor: "license_status", sortable: true},
				{Header: "Install Date", id: "install_date", accessor: d => moment(d.install_date).format("YYYY-MM-DD"), sortable: false}]},
			{Header: "Version Information", columns: [
				{Header: "Number", minWidth: 170, id: "version_sort", accessor: Utils.renderVersionNumber, sortable: true, clickable: true},
				{Header: "Status", accessor: "status", sortable: true},
				{Header: "Release Date", id: "release_date", accessor: d => moment(d.release_date).format("YYYY-MM-DD"), sortable: false}]}
		];

		return (
			<div className="slds-card">
				<CardHeader title="Installed Versions" icon={PACKAGE_VERSION_ICON} count={this.state.itemCount}/>
				<section className="slds-card__body">
					<DataTable id="InstalledVersionCard" columns={columns}
								 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn} refetchFor={this.props.refetchFor}
								 onFilter={this.filterHandler} onClick={this.linkHandler}/>
					<DataTableFilterHelp/>
				</section>
				<footer className="slds-card__footer"/>
			</div>
		);
	}

	// Handlers
	linkHandler = (e, column, rowInfo) => {
		switch (column.id) {
			case "package_name":
				window.location = "/package/" + rowInfo.original.package_id;
				break;
			case "version_sort":
				window.location = "/packageversion/" + rowInfo.original.latest_version_id;
				break;
			default:
		}
	};

	filterHandler (filtered, filterColumns, itemCount) {
		this.setState({itemCount});
	}
}