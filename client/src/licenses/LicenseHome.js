import React from 'react';

import * as sortage from '../services/sortage';
import * as licenseService from '../services/LicenseService';

import {HomeHeader} from '../components/PageHeader';

import LicenseList from './LicenseList';
import {DataTableFilterHelp} from "../components/DataTableFilter";

export default class extends React.Component {
	SORTAGE_KEY = "LicenseList";

	state = {
		view: "grid",
		sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "name", "asc"),
		licenses: [],
		itemCount: "..."
	};

	requestData = (pageSize, page, sorted, filtered) => {
		return new Promise((resolve, reject) => {
			licenseService.requestAll(sorted.length === 0 ? this.state.sortOrder : sortage.changeSortOrder(this.SORTAGE_KEY, sorted[0].id, sorted[0].desc ? "desc" : "asc"), filtered)
			.then(licenses => {
				this.setState({licenses, itemCount: licenses.length});
				// You must return an object containing the rows of the current page, and optionally the total pages number.
				return resolve({
					rows: licenses.slice(pageSize * page, pageSize * page + pageSize),
					pages: Math.ceil(licenses.length / pageSize)
				});				
			})
			.catch(reject);
		});
	};

	filterHandler = (filtered) => {
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
				<LicenseList licenses={this.state.licenses} onRequest={this.requestData} onFilter={this.filterHandler}/>
				<DataTableFilterHelp/>
			</div>
		);
	}
}