import React from 'react';

import ReactTable from "react-table";

import "react-table/react-table.css";

import checkboxHOC from "react-table/lib/hoc/selectTable";
import * as sortage from "../services/sortage";

const CheckboxTable = checkboxHOC(ReactTable);

export default class extends React.Component {
	state = {
		data: [],
		selection: [],
		selectAll: false,
		pageSize: this.props.pageSize || 20,
		minRows: this.props.minRows || 3,
		keyField: this.props.keyField || "id"
	};

	componentWillReceiveProps(props) {
		this.setState({data: props.data || []});
	}

	handleSelection = (key, shift, row) => {
		/*
		  Implementation of how to manage the selection state is up to the developer.
		  This implementation uses an array stored in the component state.
		  Other implementations could use object keys, a Javascript Set, or Redux... etc.
		*/
		// start off with the existing state
		let selection = [...this.state.selection];
		const keyIndex = selection.indexOf(key);
		// check to see if the key exists
		if (keyIndex >= 0) {
			// it does exist so we will remove it using destructing
			selection = [
				...selection.slice(0, keyIndex),
				...selection.slice(keyIndex + 1)
			];
		} else {
			// it does not exist so add it
			selection.push(key);
		}
		// update the state
		this.setState({selection});

		if (this.props.onSelect) {
			this.props.onSelect(selection);
		}
	};

	handleSelectAll = () => {
		/*
		  'toggleAll' is a tricky concept with any filterable table
		  do you just select ALL the records that are in your data?
		  OR
		  do you only select ALL the records that are in the current filtered data?

		  The latter makes more sense because 'selection' is a visual thing for the user.
		  This is especially true if you are going to implement a set of external functions
		  that act on the selected information (you would not want to DELETE the wrong thing!).

		  So, to that end, access to the internals of ReactTable are required to get what is
		  currently visible in the table (either on the current page or any other page).

		  The HOC provides a method call 'getWrappedInstance' to get a ref to the wrapped
		  ReactTable and then get the internal state and the 'sortedData'.
		  That can then be iterrated to get all the currently visible records and set
		  the selection state.
		*/
		const selectAll = !this.state.selectAll;
		const selection = [];
		if (selectAll) {
			// we need to get at the internals of ReactTable
			const wrappedInstance = this.checkboxTable.getWrappedInstance ? this.checkboxTable.getWrappedInstance() : this.checkboxTable;
			// the 'sortedData' property contains the currently accessible records based on the filter and sort
			const currentRecords = wrappedInstance.getResolvedState().sortedData;
			// we just push all the IDs onto the selection array
			currentRecords.forEach(item => {
				selection.push(item._original[this.state.keyField]);
			});
		}
		this.setState({selectAll, selection});

		if (this.props.onSelect) {
			this.props.onSelect(selection);
		}
	};

	handleFilter = (column, value) => {
		if (this.props.onFilter) {
			const wrappedInstance = this.checkboxTable.getWrappedInstance ? this.checkboxTable.getWrappedInstance() : this.checkboxTable;
			const currentRecords = wrappedInstance.getResolvedState().sortedData;
			this.props.onFilter(currentRecords, column, value)
		}
	};

	isSelected = key => {
		/*
		  Instead of passing our external selection state we provide an 'isSelected'
		  callback and detect the selection state ourselves. This allows any implementation
		  for selection (either an array, object keys, or even a Javascript Set object).
		*/
		return this.state.selection.includes(key);
	};

	pageSizeHandler = (pageSize) => {
		this.setState({pageSize});
	};

	render() {
		const selectionProps = {
			selectAll: this.state.selectAll,
			isSelected: this.isSelected,
			toggleSelection: this.handleSelection,
			toggleAll: this.handleSelectAll,
			selectType: "checkbox"
		};

		const functionalProps = {
			getTrProps: (s, r) => {
				// someone asked for an example of a background color change
				// here it is...
				const selected = r && r.original && this.isSelected(r.original[this.state.keyField]);
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

		// AB, CD, EF

		// ABC
		// DEF
		// XYZ

		// RESULT: 
		// ABC, DEF
		let TableImpl = this.props.onSelect ? CheckboxTable : ReactTable;
		return (
			<TableImpl
				defaultFilterMethod={(filter, row) => {
					let fieldVal = row[filter.id];
					const filters = filter.value.split(",");
					for (let i = 0; i < filters.length; i++) {
						let filterVal = filters[i].trim();
						let neg = filterVal.startsWith("!");
						filterVal = neg ? filterVal.substring(1) : filterVal;
						if (filterVal === "") {
							return true; // No filter after all.
						}

						let starts = filterVal.startsWith("^");
						filterVal = starts ? filterVal.substring(1) : filterVal;
						if (filterVal === "") {
							return true; // No filter after all.
						}

						let ends = filterVal.endsWith("$");
						filterVal = ends ? filterVal.substring(0, filterVal.length - 1) : filterVal;
						if (filterVal === "") {
							return true; // No filter after all.
						}

						let whole = (filterVal.charAt(0) === "'" || filterVal.charAt(0) === '"')
							&& (filterVal.charAt(filterVal.length - 1) === "'" || filterVal.charAt(filterVal.length - 1) === '"');
						filterVal = whole ? filterVal.substring(1, filterVal.length - 1) : filterVal;
						if (filterVal === "") {
							return true; // No filter after all.
						}

						// Special case: we have a negative filter and no field val, which means Eureka
						if (!fieldVal || fieldVal === '')
							return neg;

						let found =
							starts ?
								fieldVal.toLowerCase().startsWith(filterVal.toLowerCase()) :
								ends ?
									fieldVal.toLowerCase().endsWith(filterVal.toLowerCase()) :
									whole ?
										fieldVal.toLowerCase() === filterVal.toLowerCase() :
										fieldVal.toLowerCase().indexOf(filterVal.toLowerCase()) !== -1;

						if (found) {
							// Yay found, but only return true if we aren't negative
							if (!neg) {
								return true;
							}
						} else {
							// Boo not found, but return true if we are negative
							if (neg) {
								return true;
							}
						}
					}
				}}
				ref={r => (this.checkboxTable = r)}
				data={this.state.data}
				columns={this.props.columns}
				pageSize={this.state.pageSize}
				onPageSizeChange={this.pageSizeHandler}
				filterable={this.props.filterable || this.state.data.length > this.state.pageSize}
				showPagination={this.props.showPagination || this.state.data.length > this.state.pageSize}
				minRows={this.state.minRows}
				keyField={this.state.keyField}
				className="-striped -highlight"
				pivotBy={this.props.pivotBy || []}
				onSortedChange={newSorted => sortage.changeSortOrder(this.props.id, newSorted[0].id, newSorted[0].desc ? "desc" : "asc")}
				onFilteredChange={(column, value) => this.handleFilter(column, value)}
				{...selectionProps}
				{...functionalProps}
			/>
		);
	}
}