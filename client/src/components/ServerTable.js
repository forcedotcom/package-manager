import React from 'react';

import sort from 'js-flock/es5/sort';
import debounce from 'lodash.debounce';
import ReactTable from "react-table";
import "react-table/react-table.css";
import checkboxHOC from "react-table/lib/hoc/selectTable";
import * as sortage from "../services/sortage";
import * as filtrage from "../services/filter";
import {DataTableFilter} from "./DataTableFilter";

const CheckboxTable = checkboxHOC(ReactTable);

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			rows: [],
			data: [],
			selection: this.props.selection || new Map(),
			selectAll: false,
			pageSize: this.props.pageSize || 25,
			minRows: this.props.minRows || 3,
			keyField: this.props.keyField || "id",
	
			pages: null,
			loading: true,
		};
	}

	componentWillReceiveProps(props) {
		const {data, showSelected} = props;
		if (showSelected) {
			this.setState({rows: Array.from(props.selection.values()), showSelected});
		} else if (this.state.showSelected) {
			// We switched from showing selected to NOT showing selected, so force a data change event here.
			this.dataChanged(data, showSelected, this.state.lastFiltered, this.state.lastSorted, this.state.lastPage, this.state.pageSize);
		} else {
			this.setState({data});
		}
	}
	
	handleSelection = (key, shift, row) => {
		if (!this.state.selection.has(key)) {
			this.state.selection.set(key, row);
		} else {
			this.state.selection.delete(key);
		}
		this.setState({selection: this.state.selection});
		if (this.props.onSelect) {
			this.props.onSelect(this.state.selection);
		}
	};

	handleSelectAll = () => {
		const selectAll = !this.state.selectAll;
		const selection = this.state.selection;
		const rows = this.state.filteredRows || this.state.data;
		if (selectAll) {
			rows.forEach(item => {
				selection.set(item[this.state.keyField], item);
			});
		} else {
			selection.clear();
		}
		this.setState({selectAll, selection});
		if (this.props.onSelect) {
			this.props.onSelect(selection);
		}
	};

	isSelected = key => {
		/*
		  Instead of passing our external selection state we provide an 'isSelected'
		  callback and detect the selection state ourselves. This allows any implementation
		  for selection (either an array, object keys, or even a Javascript Set object).
		*/
		return this.state.selection.has(key);
	};


	fetch = (pageSize, page, sorted, filtered, sanitizedFilters) => {
		this.setState({loading: true});
		this.props.onRequest(pageSize, page, sorted, sanitizedFilters).then(
			res => this.setState({rows: res.rows, pages: res.pages, lastFiltered: filtered, lastSorted: sorted, lastPage: page, loading: false}))
	};
	
	debounceFetch = debounce(this.fetch, 300);

	filterAndSortRows = (rows, filterColumns, sortColumns, page, pageSize, showSelected) => {
		let filteredRows = null;
		if (filterColumns && filterColumns.length > 0) {
			filterColumns.forEach(f => rows = filtrage.filterRows(f, rows));
		}

		if (sortColumns && sortColumns.length > 0) {
			let sortColumn = sortColumns[0].id;
			if (sortColumns[0].desc) {
				sort(rows).desc(r => sortage.getSortValue(r, sortColumn));
			} else {
				sort(rows).asc(r => sortage.getSortValue(r, sortColumn));
			}
		}

		if (filterColumns && filterColumns.length > 0) {
			// Notify onFilter if filters applied, but after sorting
			if (this.props.onFilter) {
				this.props.onFilter(rows);
			}
			filteredRows = rows;
		}
		
		// We already have our full rowset and the filters did not change, so don't go back to the server.
		this.setState({
			rows: rows.slice(pageSize * page, pageSize * page + pageSize), filteredRows, showSelected,
			pages: Math.ceil(rows.length / pageSize),
			lastFiltered: filterColumns ? filterColumns : this.state.lastFiltered, lastSorted: sortColumns ? sortColumns : this.state.lastSorted, lastPage: page
		});	
	};
	
	debounceFilterAndSortRows = debounce(this.filterAndSortRows, 300);
	
	/** TODO
	 * if filtered, yay, render below a Save Filter button.  When clicked, saves Filtered to db
	 * Load saved filters from db, and selected filter from local storage.
	 * Add a Show All button which just nulls the selected local filter and refetches the table data if needed
	 * Add a Delete Filter button which only appears when a filter is selected, and deletes that selected saved filter.
	 * 		Optionally add a delete icon to each filter to skip having to select it first and to save another button.
	 * Support many filters using an arrow dropdown menu but limit to something reasonable like 10 or 15
	 *
	 */
	fetchData = state => {
		const {data, showSelected} = this.state; // ServerTable state
		const {filtered, sorted, page, pageSize} = state; // inner react table state
		this.dataChanged(data, showSelected, filtered, sorted, page, pageSize);
	};
	
	dataChanged = (data, showSelected, filtered, sorted, page, pageSize) => {
		const {lastFiltered, lastSorted, selection} = this.state; // ServerTable state
		
		const sanitizedFilters = filtrage.sanitize(filtered);
		if (filtered && !sanitizedFilters) {
			// Bad filters, just ignore and don't change a thing.
			return;
		}

		let changedSort = JSON.stringify(lastSorted) !== JSON.stringify(sorted);
		let changedFilter = JSON.stringify(lastFiltered) !== JSON.stringify(filtered);
		if (changedFilter && this.props.onFilterChange) {
			this.props.onFilterChange(filtered);
		}

		const rows = showSelected ? Array.from(selection.values()) : data;
		if (rows.length === 0) {
			// We only want to debounce if our filters changed.  Not on initial load, not on a sort change.
			if (rows.length > 0 && changedFilter) {
				this.debounceFetch(pageSize, page, sorted, filtered, sanitizedFilters);
			} else {
				this.fetch(pageSize, page, sorted, filtered, sanitizedFilters);
			}
		}
		else {
			if (changedFilter) {
				this.debounceFilterAndSortRows(rows, filtered, changedSort ? sorted : null, page, pageSize, showSelected);
			} else {
				this.filterAndSortRows(rows, null, changedSort ? sorted : null, page, pageSize, showSelected);
			}
		}
	};

	render() {
		const {keyField, selectAll, rows, pages, loading} = this.state;

		const selectionProps = {
			selectAll: selectAll,
			isSelected: this.isSelected,
			toggleSelection: this.handleSelection,
			toggleAll: this.handleSelectAll,
			selectType: "checkbox"
		};

		const functionalProps = {
			getTrProps: (s, r) => {
				// someone asked for an example of a background color change
				// here it is...
				const selected = r && r.original && this.isSelected(r.original[keyField]);
				return {
					style: {
						backgroundColor: selected ? "#E0FFE0" : "inherit"
					}
				};
			},
			getTdProps: (state, rowInfo, column, instance) => {
				let clickable = rowInfo && this.props.onClick && column.clickable;

				return clickable ? {
					onClick: (e, handleOriginal) => {
						if (this.props.onClick) {
							this.props.onClick(e, column, rowInfo, instance);
						}
						if (handleOriginal) {
							handleOriginal();
						}
					},
					style: {"color": clickable ? "#0070d2" : "inherit", "cursor": clickable ? "pointer" : "inherit"}
				} : {};
			}
		};

		let TableImpl = this.props.onSelect ? CheckboxTable : ReactTable;
		return (
			<TableImpl
				manual // Forces table not to paginate or sort automatically, so we can handle it server-side
				pages={pages} // Display the total number of pages
				loading={loading} // Display the loading overlay when we need it
				onFetchData={this.fetchData} // Request new data when things change
				
				ref={r => (this.checkboxTable = r)}
				data={rows}
				columns={this.props.columns}
				filterable
				defaultPageSize={this.state.pageSize}
				keyField={keyField}
				className="-striped -highlight"
				FilterComponent={DataTableFilter}
				{...selectionProps}
				{...functionalProps}
			/>
		);
	}
}