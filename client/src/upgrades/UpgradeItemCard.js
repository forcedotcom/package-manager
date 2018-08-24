import React from 'react';

import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {Status, UPGRADE_ITEM_ICON} from "../Constants";
import DataTable from "../components/DataTable";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	linkHandler = (e, column, rowInfo) => {
		switch (column.id) {
			case "start_time":
				window.location = "/upgradeitem/" + rowInfo.original.id;
				break;
			case "package_name":
				window.location = "/package/" + rowInfo.original.package_id;
				break;
			case "version_number":
				window.location = "/packageversion/" + rowInfo.original.version_id;
				break;
			default:
			// Nothing...
		}
	};

	filterHandler = (filtered, filterColumns, itemCount) => {
		this.setState({itemCount});
	};

	render() {
		let columns = [
			{
				Header: "Scheduled Start Time",
				id: "start_time",
				accessor: d => moment(d.start_time).format("lll"),
				sortable: true,
				clickable: true
			},
			{Header: "Package Name", accessor: "package_name", sortable: true, clickable: true},
			{Header: "Package Version", accessor: "version_number", sortable: true, clickable: true},
			{Header: "Orgs", accessor: "job_count", sortable: true},
			{
				Header: "Status", accessor: "status", sortable: true,
				Cell: row => (
					<div>
                    <span style={{
						padding: "2px 10px 2px 10px",
						backgroundColor: row.value === "Failed" ? "#C00" : row.value === "Canceled" || (row.original.job_count !== "0" && row.original.eligible_job_count === "0") ? "#d0a600" : "inherit",
						color: (row.value === "Failed" || (row.original.job_count !== "0" && row.original.eligible_job_count === "0") || row.value === "Canceled") ? "white" : "inherit",
						borderRadius: '10px',
						transition: 'all .3s ease-in'
					}}>
                        {(row.original.job_count !== "0" && row.original.eligible_job_count === "0") ? Status.Ineligible : row.value}
                    </span>
					</div>
				)
			}
		];

		return (
			<div className="slds-card">
				<CardHeader title="Upgrade Requests" icon={UPGRADE_ITEM_ICON} actions={this.props.actions} count={this.state.itemCount}>
					{this.props.notes}
				</CardHeader>
				<section className="slds-card__body">
					<DataTable id="UpgradeItemCard" columns={columns}
								 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn}
								 onClick={this.linkHandler} onFilter={this.filterHandler} 
								 onSelect={this.props.onSelect}/>
				</section>
				<footer className="slds-card__footer"/>
			</div>
		);
	}
}