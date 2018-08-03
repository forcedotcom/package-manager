import React from 'react';

import * as sortage from '../services/sortage';

import {HomeHeader} from '../components/PageHeader';
import UpgradeList from "./UpgradeList";
import * as upgradeService from "../services/UpgradeService";
import {UPGRADE_ICON} from "../Constants";
import {DataTableFilterHelp} from "../components/DataTableFilter";

export default class extends React.Component {
	SORTAGE_KEY = "UpgradeList";

	state = {sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "id", "desc"), upgrades: [], itemCount: "..."};

	componentDidMount() {
		upgradeService.requestAll(this.state.sortOrder).then(upgrades => this.setState({
			upgrades,
			itemCount: upgrades.length
		}));
	}

	filterHandler = (filtered) => {
		this.setState({itemCount: filtered.length});
	};

	render() {
		return (
			<div>
				<HomeHeader type="upgrades"
							title="Upgrades"
							icon={UPGRADE_ICON}
							itemCount={this.state.itemCount}/>
				<UpgradeList upgrades={this.state.upgrades} onFilter={this.filterHandler}/>
				<DataTableFilterHelp/>
			</div>
		);
	}
}