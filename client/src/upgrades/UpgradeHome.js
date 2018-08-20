import React from 'react';

import {HomeHeader} from '../components/PageHeader';
import UpgradeList from "./UpgradeList";
import * as upgradeService from "../services/UpgradeService";
import {UPGRADE_ICON} from "../Constants";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {}
	}

	fetchData = () => {
		return upgradeService.requestAll();
	}

	filterHandler = (filtered) => {
		this.setState({itemCount: filtered.length});
	};

	render() {
		return (
			<div>
				<HomeHeader type="upgrades" title="Upgrades" icon={UPGRADE_ICON} itemCount={this.state.itemCount}/>
				<UpgradeList onFetch={this.fetchData} onFilter={this.filterHandler}/>
			</div>
		);
	}
}