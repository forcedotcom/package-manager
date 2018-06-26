import React from 'react';

import * as sortage from '../services/sortage';
import * as licenseService from '../services/LicenseService';

import {HomeHeader} from '../components/PageHeader';

import LicenseList from './LicenseList';

export default class extends React.Component {
	SORTAGE_KEY = "LicenseList";

	state = {
		view: "grid",
		sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "name", "asc"),
		licenses: [],
		itemCount: "..."
	};

	componentDidMount() {
		licenseService.requestAll(this.state.sortOrder).then(licenses => this.setState({
			licenses,
			itemCount: licenses.length
		}));
	}

	sortHandler = (field) => {
		let sortOrder = sortage.changeSortOrder(this.SORTAGE_KEY, field);
		licenseService.requestAll(sortOrder).then(licenses => {
			this.setState({licenses, sortOrder});
		});
	};

	filterHandler = (filtered, column, value) => {
		this.setState({itemCount: filtered.length});
	};

	viewChangeHandler = (value) => {
		this.setState({view: value});
	};

	render() {
		return (
			<div>
				<HomeHeader type="licenses"
							title="Licenses"
							actions={[]}
							itemCount={this.state.itemCount}
							viewOptions={[{value: "table", label: "Table", icon: "table"}, {
								value: "map",
								label: "Map",
								icon: "location"
							}, {value: "split", label: "Split", icon: "layout"}]}
							sortOptions={[{value: "name", label: "Name"}, {
								value: "status",
								label: "Status"
							}, {value: "modified_date", label: "Modified Date"}, {
								value: "packageversion",
								label: "Package Version"
							}]}
							onSort={this.sortHandler}
							onViewChange={this.viewChangeHandler}/>
				<LicenseList licenses={this.state.licenses} onFilter={this.filterHandler} onSort={this.sortHandler}/>
			</div>
		);
	}
}