import React from 'react';
import moment from "moment";
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";

export default class extends React.Component {
	constructor(props) {
		super(props);
		
		this.linkHandler = this.linkHandler.bind(this);
	}

	// Lifecycle
	render() {
		const columns = [
			{Header: "Name", accessor: "name", sortable: true, clickable: true},
			{Header: "Description", accessor: "description", clickable: true},
			{Header: "Created", id: "created_date", maxWidth: 200, accessor: d => d.created_date ? moment(d.created_date).format("YYYY-MM-DD HH:mm:ss A") : null, clickable: true},
			{Header: "When", id: "when", maxWidth: 200, accessor: d => d.created_date ? moment(d.created_date).fromNow() : null, clickable: true, sortable: false}
		];
		return (
			<div>
				<DataTable id="OrgGroupList" keyField="id" columns={columns} onFetch={this.props.onFetch} refetchOn={this.props.refetchOn}
						 onClick={this.linkHandler} onFilter={this.props.onFilter} filters={this.props.filterColumns}
						 defaultFilter={{id: "type", value: this.props.type}}
						 showSelected={this.props.showSelected} selection={this.props.selected} 
						 onSelect={this.props.onSelect}/>
				<DataTableFilterHelp/>
			</div>
		);
	}
	
	// Handlers
	linkHandler(e, column, rowInfo) {
		window.location = "/orggroup/" + rowInfo.original.id;
	}
}