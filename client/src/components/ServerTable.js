import React from 'react';

import debounce from 'lodash.debounce';
import ReactTable from "react-table";
import "react-table/react-table.css";
import checkboxHOC from "react-table/lib/hoc/selectTable";
import * as jsep from 'jsep';

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
			if (window.confirm("Select all records, or just this page"))
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
	
	fetchData = debounce((state, instance) => {
		try {
			state.filtered.forEach(f => jsep(f.value));
		} catch (e) {
			// Bad filters, just ignore and don't change a thing.
			console.log("Bad filters: " + JSON.stringify(state.filtered));
			return;
		}
		
		// Whenever the table model changes, or the user sorts or changes pages, this method gets called and passed the current table model.
		this.setState({ loading: true });
		this.props.onRequest(
			state.pageSize,
			state.page,
			state.sorted,
			state.filtered
		).then(res => {
			this.setState({
				rawData: res.rows,
				data: res.rows,
				pages: res.pages,
				loading: false 
			});
		});
	}, 400);

	render() {
		const {data, pages, loading} = this.state;

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
				manual // Forces table not to paginate or sort automatically, so we can handle it server-side
				ref={r => (this.checkboxTable = r)}
				data={data}
				columns={this.props.columns}
				pages={pages} // Display the total number of pages
				loading={loading} // Display the loading overlay when we need it
				onFetchData={this.fetchData} // Request new data when things change
				filterable
				defaultPageSize={20}
				keyField={this.state.keyField}
				className="-striped -highlight"
				{...selectionProps}
				{...functionalProps}
			/>
		);
	}
}