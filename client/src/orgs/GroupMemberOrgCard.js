import React from 'react';

import {CardHeader} from "../components/PageHeader";
import {ORG_ICON} from "../Constants";
import DataTable from "../components/DataTable";
import DataTableSavedFilters from "../components/DataTableSavedFilters";

export default class extends React.Component {
	state = {itemCount: null};

	componentWillReceiveProps(props) {
		if (props.orgs) {
			this.setState({itemCount: props.orgs.length});
		}
	};

	filterHandler = (filtered, filterColumns, itemCount) => {
		this.setState({itemCount, filterColumns});
	};

	applySavedFilter = (filterColumns) => {
		this.setState({filterColumns});
	};

	linkHandler = (e, column, rowInfo) => {
		window.location = "/org/" + rowInfo.row.org_id;
	};

	render() {
		const {filterColumns} = this.state;
		const columns = [
			{Header: "Org ID", accessor: "org_id", sortable: true, clickable: true},
			{Header: "Name", accessor: "name", sortable: true, clickable: true},
			{Header: "Account", accessor: "account_name", sortable: true, clickable: true},
			{Header: "Instance", accessor: "instance", sortable: true},
			{Header: "Type", accessor: "type", sortable: true},
			{Header: "Edition", accessor: "edition", sortable: true},
			{Header: "Groups", accessor: "groups", sortable: true},
			{Header: "Status", accessor: "status", sortable: true}
		];

		const actions = [
			<DataTableSavedFilters key="GroupMemberOrgCard" id="GroupMemberOrgCard" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
		].concat(this.props.actions);
		return (
			<article className="slds-card">
				<CardHeader title="Members" icon={ORG_ICON} actions={actions} count={this.state.itemCount}/>
				<div className="slds-card__body">
					<DataTable id="GroupMemberOrgCard" keyField="org_id" columns={columns}
								 onFetch={this.props.onFetch} refetchOn={this.props.refetchOn}
								 onClick={this.linkHandler} onFilter={this.filterHandler} filters={filterColumns}
								 selection={this.props.selected} onSelect={this.props.onSelect}/>
				</div>
				<footer className="slds-card__footer"/>
			</article>
		);
	}
}