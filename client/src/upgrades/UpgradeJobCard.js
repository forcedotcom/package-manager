import React from 'react';

import DataTable from "../components/DataTable";
import {CardHeader} from "../components/PageHeader";
import {UPGRADE_JOB_ICON} from "../Constants";
import MessageWindow from "../components/MessageWindow";

export default class extends React.Component {
	state = {done: false, itemCount: "..."};

	linkHandler = (e, column, rowInfo) => {
		switch (column.id) {
			case "org_id":
			case "account_name":
				window.location = "/org/" + rowInfo.original.org_id;
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

	componentWillReceiveProps(props) {
		if (props.jobs) {
			this.setState({itemCount: props.jobs.length});
		}
	}

	filterHandler = (filtered) => {
		this.setState({itemCount: filtered.length});
	};

	openMessageWindow = (event) => {
		const msg = event.target.getAttribute("data-message");
		if (msg) {
			const subj = event.target.getAttribute("data-subject");
			this.setState({showMessage: true, messageSubject: subj, messageDetail: msg});
		}
	};

	closeMessageWindow = () => this.setState({showMessage: null});

	render() {
		let columns = [
			{Header: "Org ID", accessor: "org_id", clickable: true, minWidth: 160, filterable: true},
			{
				Header: "Account",
				accessor: "account_name",
				sortable: true,
				clickable: true,
				minWidth: 250,
				filterable: true
			},
			{
				Header: "Package Name",
				accessor: "package_name",
				sortable: true,
				clickable: true,
				minWidth: 200,
				filterable: true
			},
			{
				Header: "Current Version",
				accessor: "current_version_number",
				sortable: true,
				clickable: true,
				minWidth: 100,
				filterable: true
			},
			{
				Header: "Upgrade Version",
				accessor: "version_number",
				sortable: true,
				clickable: true,
				minWidth: 100,
				filterable: true
			},
			{
				Header: "Status", accessor: "status", sortable: true, filterable: true,
				Cell: row => (
					<div>
                        <span data-subject={row.value} data-message={row.original.message}
							  onClick={this.openMessageWindow} style={{
							padding: "2px 10px 2px 10px",
							backgroundColor: row.original.message ? "#C00" : "inherit",
							cursor: row.original.message ? "pointer" : "inherit",
							color: row.original.message ? "white" : "inherit",
							borderRadius: '10px',
							transition: 'all .3s ease-in'
						}}>
                            {row.value ? row.value : "Retrieving Status..."}</span>
					</div>
				)
			}
		];

		return (
			<div className="slds-card">
				<CardHeader title="Upgrade Jobs" icon={UPGRADE_JOB_ICON} count={this.state.itemCount}/>
				<section className="slds-card__body">
					<DataTable id="UpgradeJobCard" minRows="1" data={this.props.jobs} onFilter={this.filterHandler}
							   onClick={this.linkHandler} columns={columns}/>
				</section>
				<footer className="slds-card__footer"/>
				{this.state.showMessage ?
					<MessageWindow subject={this.state.messageSubject} message={this.state.messageDetail}
								   onClose={this.closeMessageWindow}/> : ""}
			</div>
		);
	}
}