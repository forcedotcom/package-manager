import React from 'react';

import debounce from 'lodash.debounce';
import ReactTable from "react-table";
import "react-table/react-table.css";
import checkboxHOC from "react-table/lib/hoc/selectTable";
import * as storage from "../services/storage";
import * as sortage from "../services/sortage";
import * as filtrage from "../services/filtrage";
import {DataTableFilter, DataTableFilterDisabled} from "./DataTableFilter";
import * as notifier from "../services/notifications";

const CheckboxTable = checkboxHOC(ReactTable);

export default class extends React.Component {
	constructor(props) {
		super(props);
		let {id, minRows, keyField, selection, showSelected} = props;

		this.state = {
			tableId: id,
			data: [],
			pages: null,
			loading: true,

			showSelected,
			selection: selection || new Map(),
			selectAll: false,
			minRows: minRows || 3,
			keyField: keyField || "id"
		};

		this.handleSelection = this.handleSelection.bind(this);
		this.handleSelectAll = this.handleSelectAll.bind(this);
		this.isSelected = this.isSelected.bind(this);
		this.filterAndSort = this.filterAndSort.bind(this);
		this.fetchData = this.fetchData.bind(this);
		this.refetchData = this.refetchData.bind(this);
		this.dataChanged = this.dataChanged.bind(this);
	}

	// Lifecycle
	componentDidMount() {
		if (this.props.refetchOn)
			notifier.on(this.props.refetchOn, this.refetchData.bind(this));
	}

	componentWillUnmount() {
		if (this.props.refetchOn)
			notifier.remove(this.props.refetchOn, this.refetchData);
	}

	componentWillReceiveProps(props) {
		let {defaultFilter, showSelected} = props;
		let {tableId, data} = this.state;

		let filterColumns = props.filters ? props.filters : filtrage.getFilterColumns(tableId);
		if (defaultFilter) {
			// Remove existing default filter if found, then add it back
			filterColumns = filterColumns.filter(c => c.id !== defaultFilter.id);
			filterColumns.push(defaultFilter);
		}
		if (props.fetchName !== this.props.fetchName) {
			// If fetch name changed, call onFetch again
			this.setState({loading: true});
			this.refetchData(null, props.onFetch);
		} else {
			const force = props.showSelected !== this.props.showSelected;
			this.dataChanged(tableId, data, showSelected, filterColumns, sortage.getSortColumns(tableId), 0, sortage.getPageSize(tableId), false, force);
		}
	}

	render() {
		const {tableId, keyField, selectAll, rows, pages, loading, filterable} = this.state;

		const filterColumns = filtrage.getFilterColumns(tableId);
		const sortColumns = sortage.getSortColumns(tableId);
		const pageSize = sortage.getPageSize(tableId);

		const selectionProps = {
			selectAll: selectAll,
			isSelected: this.isSelected,
			toggleSelection: this.handleSelection,
			toggleAll: this.handleSelectAll,
			selectType: "checkbox"
		};

		const functionalProps = {
			getTrProps: (s, r) => {
				// Set selected rows to different background color
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
				columns={this.props.columns}
				manual // Forces table not to paginate or sort automatically, so we can handle it server-side
				data={rows}
				pages={pages}
				loading={loading}
				onFetchData={this.fetchData} // Request new data when things change

				ref={r => (this.checkboxTable = r)}
				filterable
				defaultPageSize={pageSize}
				pageSizeOptions={[5, 10, 15, 20, 25, 50, 100]}
				defaultFiltered={filterColumns}
				defaultSorted={sortColumns}
				keyField={keyField}
				className="-striped -highlight"
				FilterComponent={filterable ? DataTableFilter : DataTableFilterDisabled}
				{...selectionProps}
				{...functionalProps}
			/>
		);
	}

	// Handlers
	handleSelection(key, shift, row) {
		if (!this.state.selection.has(key)) {
			this.state.selection.set(key, row);
		} else {
			this.state.selection.delete(key);
		}
		this.setState({selection: this.state.selection});
		if (this.props.onSelect) {
			this.props.onSelect(this.state.selection);
		}
	}

	handleSelectAll() {
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
	}

	isSelected(key) {
		/*
		  Instead of passing our external selection state we provide an 'isSelected'
		  callback and detect the selection state ourselves. This allows any implementation
		  for selection (either an array, object keys, or even a Javascript Set object).
		*/
		return this.state.selection.has(key);
	}

	filterAndSort(tableId, data, filteredRows, filterColumns, sortColumns, page, pageSize, showSelected, preview) {
		let rows = showSelected ? Array.from(this.state.selection.values()) : filteredRows || data;

		if (filterColumns) {
			rows = filtrage.filterRows(filterColumns, rows, tableId);
			sortage.sortRows(sortColumns, rows, tableId);
		} else if (sortColumns) {
			sortage.sortRows(sortColumns, rows, tableId);
		}

		sortage.setPageSize(tableId, pageSize);

		if (filterColumns) {
			// Notify onFilter if filters applied, but after sorting
			if (this.props.onFilter) {
				this.props.onFilter(rows, filterColumns, preview ? -1 : rows.length);
			}
		}
		storage.setPreviewRows(this.props.id, data.length > 3000 ? rows.slice(pageSize * page, pageSize * page + pageSize) : null);
		this.setState({
			tableId,
			loading: false,
			showSelected,
			filterable: !preview,
			data,
			rows: rows.slice(pageSize * page, pageSize * page + pageSize),
			filteredRows: rows,
			pages: Math.ceil(rows.length / pageSize),
			page,
			pageSize
		});
	}

	debounceFilterAndSort = debounce(this.filterAndSort, 250);

	fetchData(state) {
		const {tableId, data, showSelected} = this.state;
		const {filtered, sorted, page, pageSize} = state; // inner react table state

		if (data.length === 0) {
			// Haven't loaded data yet.  Do it now.
			const previewData = storage.getPreviewRows(this.props.id);
			if (previewData) {
				this.dataChanged(tableId, previewData, showSelected, filtered, sorted, page, pageSize, true, true);
			}
			else {
				this.setState({loading: true});
			}
			this.props.onFetch().then(data => {
				this.dataChanged(tableId, data, showSelected, filtered, sorted, page, pageSize, false, true);
			});
		} else {
			this.dataChanged(tableId, data, showSelected, filtered, sorted, page, pageSize, false);
		}
	}

	refetchData(keys, onFetch) {
		if (keys && this.props.refetchFor) {
			// Only proceed if one of refetchFor is contained in keys
			const ourKeys = Array.isArray(this.props.refetchFor) ? this.props.refetchFor : [this.props.refetchFor];
			const theirKeys = Array.isArray(keys) ? keys : [keys];
			if (!theirKeys.find(k => ourKeys.indexOf(k) !== -1)) {
				return;
			}
		}

		const {tableId, showSelected, page, pageSize} = this.state;

		(onFetch || this.props.onFetch)().then(data => {
			const filterColumns = filtrage.getFilterColumns(tableId);
			const sortColumns = sortage.getSortColumns(tableId);
			this.dataChanged(tableId, data, showSelected, filterColumns, sortColumns, page, pageSize, false, true);
		});
	}

	dataChanged(tableId, data, showSelected, filterColumns, sortColumns, page, pageSize, preview, force) {
		const {filteredRows} = this.state;

		let changedFilter = force || filtrage.hasChanged(filterColumns, tableId);
		let changedSort = force || sortage.hasChanged(sortColumns, tableId);
		let changedPage = this.state.page !== undefined && this.state.page !== page;
		let changedPageSize = this.state.pageSize !== undefined && this.state.pageSize !== pageSize;

		if (!changedFilter && !changedSort && !changedPage && !changedPageSize) {
			// Nothing to do.
			return;
		}

		if (changedFilter && !filtrage.sanitize(filterColumns)) {
			// Bad filters, just ignore and don't change a thing.
			return;
		}

		// Debounce if row count is over some large sounding number
		const shouldDebounce = changedFilter && (showSelected ? this.state.selection.size : data.length) > 3000;

		if (shouldDebounce) {
			this.debounceFilterAndSort(tableId, data, data, filterColumns, sortColumns, page, pageSize, showSelected, preview);
		} else if (changedFilter) {
			this.filterAndSort(tableId, data, data, filterColumns, sortColumns, page, pageSize, showSelected, preview);
		} else {
			this.filterAndSort(tableId, data, filteredRows, null, changedSort ? sortColumns : null, page, pageSize, showSelected, preview);
		}
	}
}