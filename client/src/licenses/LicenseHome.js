import React from 'react';

import * as sortage from '../services/sortage';
import * as licenseService from '../services/LicenseService';

import {HomeHeader} from '../components/PageHeader';

import LicenseList from './LicenseList';
import DataTableSavedFilters from "../components/DataTableSavedFilters";

export default class extends React.Component {
	SORTAGE_KEY = "LicenseList";

	constructor(props) {
		super(props);
		this.state = {
			sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "name", "asc")
		};
	}

	fetchData = () => {
		return licenseService.requestAll();
	};

	filterHandler = (filtered, filterColumns) => {
		this.setState({filtered, itemCount: filtered.length, filterColumns});
	};

	applySavedFilter = (filterColumns) => {
		this.setState({filterColumns});
	};
	
	render() {
		const {filterColumns} = this.state;
		const actions = [
			<DataTableSavedFilters key="LicenseList" id="LicenseList" filterColumns={filterColumns} onSelect={this.applySavedFilter}/>
		];
		return (
			<div>
				<HomeHeader type="licenses" title="Licenses" actions={actions} count={this.state.itemCount}/>
				<LicenseList onFetch={this.fetchData.bind(this)} onFilter={this.filterHandler} filterColumns={filterColumns}/>
			</div>
		);
	}
}