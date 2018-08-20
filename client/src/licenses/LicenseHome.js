import React from 'react';

import * as sortage from '../services/sortage';
import * as licenseService from '../services/LicenseService';

import {HomeHeader} from '../components/PageHeader';

import LicenseList from './LicenseList';

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

	filterHandler = (filtered) => {
		this.setState({filtered, itemCount: filtered.length});
	};

	render() {
		return (
			<div>
				<HomeHeader type="licenses" title="Licenses" actions={[]} itemCount={this.state.itemCount}/>
				<LicenseList onFetch={this.fetchData} onFilter={this.filterHandler}/>
			</div>
		);
	}
}