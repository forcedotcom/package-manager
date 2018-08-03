import React from 'react';

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
			data: props.data || [],
			selection: this.props.selection || new Map(),
			selectAll: false,
			pageSize: this.props.pageSize || 20,
			minRows: this.props.minRows || 3,
			keyField: this.props.keyField || "id"
		};
	}

	componentWillReceiveProps(props) {
		this.setState({data: props.data || []});
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
			// we need to get at the internals of ReactTable
			const wrappedInstance = this.checkboxTable.getWrappedInstance ? this.checkboxTable.getWrappedInstance() : this.checkboxTable;
			// the 'sortedData' property contains the currently accessible records based on the filter and sort
			const currentRecords = wrappedInstance.getResolvedState().sortedData;
			// we just push all the IDs onto the selection array
			currentRecords.forEach(item => {
				selection.set(item._original[this.state.keyField], item._original);
			});
		} else {
			selection.clear();
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
		return this.state.selection.has(key);
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

		let TableImpl = this.props.onSelect ? CheckboxTable : ReactTable;
		return (
			<TableImpl
				defaultFilterMethod={filtrage.executeFilterOnRow}
				ref={r => (this.checkboxTable = r)}
				data={this.state.data}
				columns={this.props.columns}
				pageSize={this.state.pageSize}
				onPageSizeChange={this.pageSizeHandler}
				filterable
				showPagination={this.props.showPagination || this.state.data.length > this.state.pageSize}
				minRows={this.state.minRows}
				keyField={this.state.keyField}
				className="-striped -highlight"
				pivotBy={this.props.pivotBy || []}
				onSortedChange={newSorted => sortage.changeSortOrder(this.props.id, newSorted[0].id, newSorted[0].desc ? "desc" : "asc")}
				onFilteredChange={(column, value) => this.handleFilter(column, value)}
				FilterComponent={DataTableFilter}
				{...selectionProps}
				{...functionalProps}
			/>
		);
	}
}