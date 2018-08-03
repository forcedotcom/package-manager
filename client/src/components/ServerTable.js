import React from 'react';

import debounce from 'lodash.debounce';
import ReactTable from "react-table";
import "react-table/react-table.css";
import checkboxHOC from "react-table/lib/hoc/selectTable";
import * as filtrage from "../services/filter";
import {DataTableFilter} from "./DataTableFilter";

const CheckboxTable = checkboxHOC(ReactTable);

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			data: [],
			allData: [],
			selection: this.props.selection || new Map(),
			selectAll: false,
			pageSize: this.props.pageSize || 20,
			minRows: this.props.minRows || 3,
			keyField: this.props.keyField || "id",
	
			pages: null,
			loading: true,
		};
	}

	componentWillReceiveProps(props) {
		this.setState({allData: props.data || []});
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
		let selection = this.state.selection;
		if (selectAll) {
			this.state.allData.forEach(item => {
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
			res => this.setState({data: res.rows, pages: res.pages, lastFiltered: filtered, lastSorted: sorted, loading: false}))
	};

	debounceFetch = debounce(this.fetch, 300);

	fetchData = state => {
		const {allData, lastFiltered, lastSorted} = this.state; // ServerTable state
		const {filtered, sorted, page, pageSize} = state; // inner react table state
		const sanitizedFilters = filtrage.sanitize(filtered);
		if (filtered && !sanitizedFilters) {
			// Bad filters, just ignore and don't change a thing.
			return;
		}
		
		let changedFilter = JSON.stringify(lastFiltered) !== JSON.stringify(filtered);
		let changedSort = JSON.stringify(lastSorted) !== JSON.stringify(sorted);
		if (allData.length > 0 && !changedFilter && !changedSort) {
			// We already have our full rowset and the filters did not change, so don't go back to the server.
			this.setState({
				data: allData.slice(pageSize * page, pageSize * page + pageSize),
				pages: Math.ceil(allData.length / pageSize)
			});
		} else {
			// We only want to debounce if our filters changed.  Not on initial load, not on a sort change.
			if (allData.length > 0 && changedFilter) {
				this.debounceFetch(pageSize, page, sorted, filtered, sanitizedFilters);
			} else {
				this.fetch(pageSize, page, sorted, filtered, sanitizedFilters);
			}
		}
	};

	render() {
		const {keyField, selectAll, data, pages, loading} = this.state;

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
				data={data}
				columns={this.props.columns}
				filterable
				defaultPageSize={20}
				keyField={keyField}
				className="-striped -highlight"
				FilterComponent={DataTableFilter}
				{...selectionProps}
				{...functionalProps}
			/>
		);
	}
}