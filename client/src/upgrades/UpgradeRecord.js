import React from 'react';

import * as upgradeService from '../services/UpgradeService';

import {RecordHeader, HeaderField} from '../components/PageHeader';
import UpgradeView from "./UpgradeView";
import * as upgradeItemService from "../services/UpgradeItemService";
import * as sortage from "../services/sortage";
import {UPGRADE_ICON} from "../Constants";

export default class extends React.Component {
    SORTAGE_KEY_ITEMS = "UpgradeItemCard";

    state = {
        upgrade: {},
        sortOrderItems: sortage.getSortOrder(this.SORTAGE_KEY_ITEMS, "id", "asc"),
    };

    componentDidMount() {
        upgradeService.requestById(this.props.match.params.upgradeId).then(upgrade => this.setState({upgrade}));
        upgradeItemService.findByUpgrade(this.props.match.params.upgradeId, this.state.sortOrderItems).then(items => {
            this.updateStatus(items);
        });
    };

    fetchItemsWithStatus() {
        upgradeItemService.findByUpgradeWithStatus(this.props.match.params.upgradeId, this.state.sortOrderItems).then(items => this.updateStatus(items));
    }

    updateStatus(items) {
        let done = true;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (["Created", "Pending", "InProgress"].indexOf(item.status) !== -1) {
                done = false;
            }
        }
        this.setState({items, status: done ? "Closed" : "Open"});
        if (!done) {
            setTimeout(this.fetchItemsWithStatus.bind(this), 5000);
        }
    }

    render() {
        return (
            <div>
                <RecordHeader type="Upgrade" icon={UPGRADE_ICON} title={this.state.upgrade.description}>
                    <HeaderField label="Start Time" format="date" value={this.state.upgrade.start_time}/>
                    <HeaderField label="State" value={this.state.status}/>
                </RecordHeader>
                <UpgradeView upgrade={this.state.upgrade} items={this.state.items} status={this.state.status}/>
            </div>
        );
    }
}