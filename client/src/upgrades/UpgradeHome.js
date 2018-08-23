import React from 'react';

import {HomeHeader} from '../components/PageHeader';
import UpgradeList from "./UpgradeList";
import * as upgradeService from "../services/UpgradeService";
import {UPGRADE_ICON} from "../Constants";
import DataTableSavedFilters from "../components/DataTableSavedFilters";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {}
	}

	fetchData = () => {
		return upgradeService.requestAll();
	};

	filterHandler = (filtered, filterColumns) => {
		this.setState({itemCount: filtered.length, filterColumns});
	};
	
	applySavedFilter = (filterColumns) => {
		this.setState({filterColumns});
	};
	
	render() {
		const {filterColumns} = this.state;

		const actions = [
			<DataTableSavedFilters key="UpgradeList" id="UpgradeList" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
		];

		return (
			<div>
				<HomeHeader type="upgrades" title="Upgrades" icon={UPGRADE_ICON} actions={actions} count={this.state.itemCount}/>
				<UpgradeList onFetch={this.fetchData.bind(this)} onFilter={this.filterHandler} filters={filterColumns}/>
			</div>
		);
	}
}