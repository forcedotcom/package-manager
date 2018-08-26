import React from 'react';

import * as licenseService from '../services/LicenseService';

import {HomeHeader} from '../components/PageHeader';

import LicenseList from './LicenseList';
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
			<DataTableSavedFilters id="LicenseList" key="LicenseList" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
		];
		return (
			<div>
				<HomeHeader type="licenses" title="Licenses" actions={actions} count={this.state.itemCount}/>
				<LicenseList onFetch={this.fetchData.bind(this)} onFilter={this.filterHandler} filterColumns={filterColumns}/>
			</div>
		);
	}
	
	// Handlers
	fetchData() {
		return licenseService.requestAll();
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({filtered, itemCount, filterColumns});
	};

	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
	}
}