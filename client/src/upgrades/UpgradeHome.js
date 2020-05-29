import React from 'react';

import {HomeHeader} from '../components/PageHeader';
import UpgradeList from "./UpgradeList";
import * as upgradeService from "../services/UpgradeService";
import {Messages, UPGRADE_ICON} from "../Constants";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import * as notifier from "../services/notifications";
import * as authService from "../services/AuthService";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			user:authService.getSessionUser(this),
			selected: new Map()
		};

		this.fetchData = this.fetchData.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.selectionHandler = this.selectionHandler.bind(this);
		this.showSelectedHandler = this.showSelectedHandler.bind(this);
		this.purgeHandler = this.purgeHandler.bind(this);
	}

	// Lifecycle
	render() {
		const {selected, filterColumns, user} = this.state;

		const actions = [
			<DataTableSavedFilters id="UpgradeList" key="UpgradeList" filterColumns={filterColumns}
								   onSelect={this.applySavedFilter}/>,
			{label: `${selected.size} Selected`, toggled: this.state.showSelected, group: "selected", handler: this.showSelectedHandler, disabled: selected.size === 0,
				detail: this.state.showSelected ? "Click to show all records" : "Click to show only records you have selected"},
			{label: "Purge", group: "selectable",
				disabled: user.read_only || selected.size === 0,
				detail: user.read_only ? Messages.READ_ONLY_USER : "",
				handler: this.purgeHandler}
		];

		return (
			<div>
				<HomeHeader type="upgrades" title="Upgrades" icon={UPGRADE_ICON} actions={actions}
							count={this.state.itemCount}/>
				<UpgradeList onFetch={this.fetchData} refetchOn="upgrades" onFilter={this.filterHandler} filters={filterColumns}
							 onSelect={this.selectionHandler} selected={selected} showSelected={this.state.showSelected}/>
			</div>
		);
	}

	// Handlers
	fetchData() {
		return upgradeService.requestAll();
	}

	showSelectedHandler() {
		this.setState({showSelected: !this.state.showSelected});
	}
	
	selectionHandler(selected) {
		let showSelected = this.state.showSelected;
		if (selected.size === 0) {
			showSelected = false;
		}
		this.setState({selected, showSelected});
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({itemCount, filterColumns});
	}
	
	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
	}
	
	purgeHandler() {
		const msg = this.state.selected.size === 1 ?
			`Are you sure you want to purge this upgrade history?` :
			`Are you sure you want to purge the history of these ${this.state.selected.size} upgrades?`;
		if (window.confirm(msg)) {
			let please = window.prompt(`Really?  Type the magic word`);
			if (please && please.toLowerCase() === 'please') {
				upgradeService.purge(Array.from(this.state.selected.keys())).then(() => {
					this.state.selected.clear();
					this.setState({showSelected: false});
				})
				.catch(e => notifier.error(e.message | e, "Fail"));
			}
		}
	}
}
