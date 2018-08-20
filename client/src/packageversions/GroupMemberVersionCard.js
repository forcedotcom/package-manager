import React from 'react';
import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {PACKAGE_VERSION_ICON} from "../Constants";
import DataTable from "../components/DataTable";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {};
	}

	linkHandler = (e, column, rowInfo) => {
		switch (column.id) {
			case "org_id":
			case "account_name":
				window.location = "/org/" + rowInfo.row.org_id;
				break;
			case "package_name":
				window.location = "/package/" + rowInfo.original.package_id;
				break;
			case "version_number":
				window.location = "/packageversion/" + rowInfo.original.latest_version_id;
				break;
			default:
		}
	};

	filterHandler = (filtered) => {
		this.setState({itemCount: filtered.length});
	};

	render() {
		const columns = [
			{Header: "Org ID", accessor: "org_id", sortable: true, clickable: true},
			{Header: "Account Name", accessor: "account_name", clickable: true},
			{Header: "Package", accessor: "package_name", clickable: true},
			{Header: "License", accessor: "license_status"},
			{Header: "Version", id: "version_number", accessor: this.renderVersionNumber, sortable: true, clickable: true},
			{Header: "Instance", accessor: "instance", sortable: true},
			{Header: "Type", accessor: "type", sortable: true},
			{Header: "Edition", accessor: "edition", sortable: true},
			{Header: "Status", accessor: "status", sortable: true},
			{Header: "Release Date", id: "release_date", accessor: d => moment(d.release_date).format("YYYY-MM-DD"), sortable: false},
		];

		return (
			<article className="slds-card">
				<CardHeader title="Installed Versions" icon={PACKAGE_VERSION_ICON} actions={this.props.actions} count={this.state.itemCount}/>
				<div className="slds-card__body">
					<DataTable id="GroupMemberVersionCard" keyField="org_id" columns={columns} 
								 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn} 
								 onFilter={this.filterHandler} onClick={this.linkHandler}
								 selection={this.props.selected} onSelect={this.props.onSelect}/>
				</div>
				<footer className="slds-card__footer"/>
			</article>
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