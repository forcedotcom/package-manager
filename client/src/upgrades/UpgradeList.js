import React from 'react';

import DataTable from "../components/DataTable";
import moment from "moment";

export default class extends React.Component {
	state = {upgrades: []};

	componentWillReceiveProps(props) {
		if (props.upgrades) {
			this.setState({upgrades: props.upgrades});
		}
	}

	linkHandler = (e, column, rowInfo) => {
		if (rowInfo) {
			window.location = "/upgrade/" + rowInfo.row.id;
		}
	};

	render() {
		let columns = [
			{Header: "Number", accessor: "id", minWidth: 30, sortable: true, clickable: true},
			{Header: "Description", accessor: "description", minWidth: 300, clickable: true},
			{
				Header: "Scheduled Start Time",
				maxWidth: 200,
				id: "start_time",
				accessor: d => moment(d.start_time).format("YYYY-MM-DD HH:mm:ss A"),
				sortable: true,
				clickable: true
			},
			{Header: "When", id: "when", accessor: d => moment(d.start_time).fromNow(), clickable: true, sortable: false},
			{Header: "Created By", accessor: "created_by", sortable: true},
			{Header: "Status", accessor: "status", sortable: true}
		];
		return (
			<DataTable id="UpgradeList" data={this.state.upgrades} onFilter={this.props.onFilter}
					   onClick={this.linkHandler} columns={columns}/>
		);
	}
}