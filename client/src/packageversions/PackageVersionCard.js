import React from 'react';

import moment from "moment/moment";
import DataTable from "../components/DataTable";
import {CardHeader} from "../components/PageHeader";
import {PACKAGE_VERSION_ICON} from "../Constants";
import * as sortage from "../services/sortage";

export default class extends React.Component {
	state = {itemCount: null};

	linkHandler = (e, column, rowInfo) => {
		window.location = "/packageversion/" + rowInfo.original.version_id;
	};

	componentWillReceiveProps(props) {
		if (props.packageVersions) {
			this.setState({itemCount: props.packageVersions.length});
		}
	}

	filterHandler = (filtered, column, value) => {
		this.setState({itemCount: filtered.length});
	};

	render() {
		let columns = [
			{
				Header: "Version Number", accessor: "version_number", sortable: true, clickable: true,
				sortMethod: (a, b) => {return sortage.getSortableVersion(a) > sortage.getSortableVersion(b) ? 1 : -1}
			},
			{
				Header: "Release Date",
				id: "release_date",
				accessor: d => moment(d.release_date).format("YYYY-MM-DD"),
				sortable: false
			},
			{Header: "Version ID", accessor: "version_id", sortable: false},
			{Header: "Status", accessor: "status", sortable: true}
		];

		return (
			<div className="slds-card">
				<CardHeader title="Package Versions" icon={PACKAGE_VERSION_ICON} count={this.state.itemCount}/>
				<section className="slds-card__body">
					<DataTable id="PackageVersionCard" data={this.props.packageVersions} onFilter={this.filterHandler}
							   onClick={this.linkHandler} columns={columns}/>
				</section>
				<footer className="slds-card__footer"/>
			</div>
		);
	}
}