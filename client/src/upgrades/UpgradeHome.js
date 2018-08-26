import React from 'react';

import {HomeHeader} from '../components/PageHeader';
import UpgradeList from "./UpgradeList";
import * as upgradeService from "../services/UpgradeService";
import {UPGRADE_ICON} from "../Constants";
import DataTableSavedFilters from "../components/DataTableSavedFilters";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		
		this.fetchData = this.fetchData.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
	}

	// Lifecycle
	render() {
		const {filterColumns} = this.state;

		const actions = [
			<DataTableSavedFilters id="UpgradeList" key="UpgradeList" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
		];

		return (
			<div>
				<HomeHeader type="upgrades" title="Upgrades" icon={UPGRADE_ICON} actions={actions} count={this.state.itemCount}/>
				<UpgradeList onFetch={this.fetchData} onFilter={this.filterHandler} filters={filterColumns}/>
			</div>
		);
	}
	
	// Handlers
	fetchData() {
		return upgradeService.requestAll();
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({itemCount, filterColumns});
	}

	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
	}
}