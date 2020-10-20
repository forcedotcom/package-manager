import React from 'react';

import * as packageService from '../services/PackageService';

import {HomeHeader} from '../components/PageHeader';
import PackageList from './PackageList';
import DataTableSavedFilters from "../components/DataTableSavedFilters";

export default class extends React.Component {
	constructor() {
		super();
		this.state = {};
	
		this.fetchData = this.fetchData.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
	}

	// Lifecycle
	render() {
		const {filterColumns} = this.state;

		const actions = [
			<DataTableSavedFilters id="PackageList" key="PackageList" offset={2} filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
		];
		return (
			<div>
				<HomeHeader type="packages" title="Packages" actions={actions} count={this.state.itemCount}
							onFilter={this.filterHandler} filters={filterColumns}/>
				<PackageList onFetch={this.fetchData} onFilter={this.filterHandler}/>
			</div>
		);
	}
	
	// Handlers
	fetchData()  {
		return packageService.requestAll();
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({filtered, itemCount, filterColumns});
	}

	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
	}

}
