import React from 'react';

import * as packageService from '../services/PackageService';

import {HomeHeader} from '../components/PageHeader';
import PackageList from './PackageList';

export default class extends React.Component {
	constructor() {
		super();
		this.state = {};
	
		this.fetchData = this.fetchData.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
	}

	// Lifecycle
	render() {
		return (
			<div>
				<HomeHeader type="packages" title="Packages" count={this.state.itemCount}/>
				<PackageList onFetch={this.fetchData.bind(this)} onFilter={this.filterHandler}/>
			</div>
		);
	}
	
	// Handlers
	fetchData()  {
		return packageService.requestAll();
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({itemCount});
	}
}