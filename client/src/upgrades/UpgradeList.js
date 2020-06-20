import React from 'react';

import moment from "moment";
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import * as nav from "../services/nav";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		
		this.linkHandler = this.linkHandler.bind(this);
	}

	// Lifecycle
	render() {
		let columns = [
			{Header: "Number", accessor: "id", minWidth: 60, sortable: true, clickable: true},
			{Header: "Description", accessor: "description", minWidth: 300, clickable: true},
			{
				Header: "Scheduled Start Time",
				maxWidth: 200,
				id: "start_time",
				accessor: d => moment(d.start_time).format("YYYY-MM-DD HH:mm:ss A"),
				sortable: true,
				clickable: true
			},
			{Header: "Job Count", accessor: "total_job_count", sortable: true},
			{Header: "When", id: "when", accessor: d => moment(d.start_time).fromNow(), clickable: true, sortable: false},
			{Header: "Created By", accessor: "created_by", sortable: true},
			{Header: "Status", accessor: "item_status", sortable: true}
		];
		return (
			<div className="slds-color__background_gray-1">
				<DataTable id="UpgradeList" onFetch={this.props.onFetch} refetchOn={this.props.refetchOn} columns={columns} onClick={this.linkHandler} 
						   onFilter={this.props.onFilter} filters={this.props.filters}
						   showSelected={this.props.showSelected} selection={this.props.selected} onSelect={this.props.onSelect}/>
				<DataTableFilterHelp/>
			</div>
		);
	}

	// Handlers
	linkHandler(e, column, rowInfo) {
		if (rowInfo) {
			nav.toPath("upgrade", rowInfo.row.id);
		}
	}
}
