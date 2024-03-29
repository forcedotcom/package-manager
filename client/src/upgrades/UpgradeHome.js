import React from 'react';
import {CSVDownload} from 'react-csv';

import {HomeHeader} from '../components/PageHeader';
import UpgradeList from "./UpgradeList";
import * as upgradeService from "../services/UpgradeService";
import * as upgradeStatsService from "../services/UpgradeStatsService";
import {Messages, UPGRADE_ICON} from "../Constants";
import DataTableSavedFilters from "../components/DataTableSavedFilters";
import * as notifier from "../services/notifications";
import * as authService from "../services/AuthService";
import AnalysisWindow from "../components/AnalysisWindow";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			user:authService.getSessionUser(this),
			selected: new Map()
		};

		this.fetchData = this.fetchData.bind(this);
		this.filterHandler = this.filterHandler.bind(this);
		this.applySavedFilter = this.applySavedFilter.bind(this);
		this.selectionHandler = this.selectionHandler.bind(this);
		this.showSelectedHandler = this.showSelectedHandler.bind(this);
		this.purgeHandler = this.purgeHandler.bind(this);
		this.openAnalysisWindow = this.openAnalysisWindow.bind(this);
		this.closeAnalysisWindow = this.closeAnalysisWindow.bind(this);
		this.exportHandler = this.exportHandler.bind(this);
	}

	// Lifecycle
	render() {
		const {selected, filterColumns, user} = this.state;

		const actions = [
			<DataTableSavedFilters id="UpgradeList" key="UpgradeList" filterColumns={filterColumns}
								   onSelect={this.applySavedFilter}/>,
			{label: `${selected.size} Selected`, toggled: this.state.showSelected, group: "selected", handler: this.showSelectedHandler, disabled: selected.size === 0,
				detail: this.state.showSelected ? "Click to show all records" : "Click to show only records you have selected"},
			{label: "Purge", group: "selectable",
				disabled: user.read_only || selected.size === 0,
				detail: user.read_only ? Messages.READ_ONLY_USER : "",
				handler: this.purgeHandler},
      		{label: "Analyze", group: "selectable",
				spinning: this.state.addingToGroup,
				disabled: selected.size === 0,
				handler: this.openAnalysisWindow},
			{label: "Export", handler: this.exportHandler}
		];

		return (
			<div>
				<HomeHeader type="upgrades" title="Upgrades" icon={UPGRADE_ICON} actions={actions}
							count={this.state.itemCount}/>
				<UpgradeList onFetch={this.fetchData} refetchOn="upgrades" onFilter={this.filterHandler} filters={filterColumns}
							 onSelect={this.selectionHandler} selected={selected} showSelected={this.state.showSelected}/>
				{this.state.showStats ?
					<AnalysisWindow title="Upgrade Analysis" stats={this.state.stats}
					onClose={this.closeAnalysisWindow}/> : ""
				}
				{this.state.isExporting ? <CSVDownload data={this.state.filtered} separator={"\t"} target="_blank" /> : ""}
			</div>
		);
	}

	// Handlers
	fetchData() {
		return upgradeService.requestAll();
	}

	showSelectedHandler() {
		this.setState({showSelected: !this.state.showSelected});
	}
	
	selectionHandler(selected) {
		let showSelected = this.state.showSelected;
		if (selected.size === 0) {
			showSelected = false;
		}
		this.setState({selected, showSelected});
	}

	filterHandler(filtered, filterColumns, itemCount) {
		this.setState({filtered, itemCount, filterColumns});
	}
	
	applySavedFilter(filterColumns) {
		this.setState({filterColumns});
	}
	
	purgeHandler() {
		const msg = this.state.selected.size === 1 ?
			`Are you sure you want to purge this upgrade history?` :
			`Are you sure you want to purge the history of these ${this.state.selected.size} upgrades?`;
		if (window.confirm(msg)) {
			let please = window.prompt(`Really?  Type the magic word`);
			if (please && please.toLowerCase() === 'please') {
				upgradeService.purge(Array.from(this.state.selected.keys())).then(() => {
					this.state.selected.clear();
					this.setState({showSelected: false});
				})
				.catch(e => notifier.error(e.message | e, "Fail"));
			}
		}
	}
	openAnalysisWindow() {
		let p =  new Promise((resolve, reject) => {
			upgradeStatsService.requestStatsById(Array.from(this.state.selected.keys())).then(data => {
				this.setState({showSelected: false});
				resolve(data);
			}).catch(reject);
		});
		p.then(data => {
			let stats = this.groupStatsByPackage(data);
			this.setState({showStats: true, stats});
		});
	}

	closeAnalysisWindow() {
		this.setState({showStats: null});
	}

    groupStatsByPackage(stats) {
		let items = [];
		for (const stat of stats) {
			const data = {};
			data.package = stat.name
			data.stats = stat.status.concat(': ' + stat.count)
			
			let elemIndex = items.findIndex( obj => obj.package === data.package)
			if(elemIndex === -1){
				items.push(data)
			} else {
				items[elemIndex].stats = items[elemIndex].stats.concat('; ' + data.stats)
			}
		}
		return items;
	}

	exportHandler() {
		this.setState({isExporting: true});
		setTimeout(function() {this.setState({isExporting: false})}.bind(this), 1000);
	}
}
