import React from 'react';

import * as orgGroupService from "../services/OrgGroupService";
import * as sortage from '../services/sortage';

import {HomeHeader} from "../components/PageHeader";
import OrgGroupList from "./OrgGroupList";
import GroupFormWindow from "./GroupFormWindow";

export default class extends React.Component {
	SORTAGE_KEY = "OrgGroupList";

	state = {
		sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "name", "asc"),
		orggroups: [],
		selected: new Map(),
		itemCount: "..."
	};

	componentDidMount() {
		orgGroupService.requestAll(this.state.sortOrder).then(orggroups => this.setState({orggroups, itemCount: orggroups.length}));
	}
	
	componentWillUnmount() {
	}
	
	filterHandler = (filtered) => {
		this.setState({itemCount: filtered.length});
	};

	newHandler = () => {
		this.setState({addingOrgGroup: true});
	};

	saveHandler = (orggroup) => {
		orgGroupService.requestCreate(orggroup).then((orggroup) => {
			window.location = `/orggroup/${orggroup.id}`;
		});
	};

	cancelHandler = () => {
		this.setState({addingOrgGroup: false});
	};

	selectionHandler = (selected) => {
		this.setState({selected});
	};

	deleteHandler = () => {
		orgGroupService.requestDelete(Array.from(this.state.selected.keys())).then(() => {
			orgGroupService.requestAll(this.state.sortOrder).then(orggroups => this.setState({orggroups}));
		});
	};

	render() {
		const actions = [
			{label: "New", handler: this.newHandler, detail: "Create new org group"},
			{
				label: "Delete",
				disabled: this.state.selected.size === 0,
				handler: this.deleteHandler,
				detail: "Delete the selected groups"
			}
		];
		return (
			<div>
				<HomeHeader type="org groups"
							title="Org Groups"
							itemCount={this.state.itemCount}
							actions={actions}/>
				<OrgGroupList orggroups={this.state.orggroups} onFilter={this.filterHandler}
							  onSelect={this.selectionHandler}/>
				{this.state.addingOrgGroup ?
					<GroupFormWindow onSave={this.saveHandler} onCancel={this.cancelHandler}/> : ""}
			</div>
		);
	}
}