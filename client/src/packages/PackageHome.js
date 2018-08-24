import React from 'react';

import * as packageService from '../services/PackageService';

import {HomeHeader} from '../components/PageHeader';
import PackageList from './PackageList';

export default class extends React.Component {
	constructor() {
		super();
		this.state = {};
	}

	fetchData = () => {
		return packageService.requestAll();
	}
	
	filterHandler = (filtered, filterColumns, itemCount) => {
		this.setState({itemCount});
	};

	render() {
		return (
			<div>
				<HomeHeader type="packages" title="Packages" count={this.state.itemCount}/>
				<PackageList onFetch={this.fetchData.bind(this)} onFilter={this.filterHandler}/>
			</div>
		);
	}
}