import React from 'react';

import * as statsService from '../services/StatsService';

import {HomeHeader} from '../components/PageHeader';

import StatsList from './StatsList';
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
			<DataTableSavedFilters id="StatsList" key="StatsList" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
		];
		return (
			<div>
				<HomeHeader type="Reports" title="Stats" actions={actions} count={this.state.itemCount}/>
				<StatsList onFetch={this.fetchData} onFilter={this.filterHandler} filterColumns={filterColumns}/>
			</div>
		);
	}
	
	// Handlers
	fetchData() {
		return statsService.requestAll();
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({filtered, itemCount, filterColumns});
	};

	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
	}
}