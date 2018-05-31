import React from 'react';

import * as upgradeService from '../services/UpgradeService';

import {HeaderField, HeaderNote, RecordHeader} from '../components/PageHeader';
import * as upgradeItemService from "../services/UpgradeItemService";
import * as sortage from "../services/sortage";
import {isDoneStatus, Status, UPGRADE_ICON} from "../Constants";
import UpgradeItemCard from "./UpgradeItemCard";
import ProgressBar from "../components/ProgressBar";

export default class extends React.Component {
    SORTAGE_KEY_ITEMS = "UpgradeItemCard";

    state = {
        selected: [],
        upgrade: {},
        sortOrderItems: sortage.getSortOrder(this.SORTAGE_KEY_ITEMS, "id", "asc"),
        items: []
    };

    componentDidMount() {
        upgradeService.requestById(this.props.match.params.upgradeId).then(upgrade => this.setState({upgrade}));
        upgradeItemService.findByUpgrade(this.props.match.params.upgradeId, this.state.sortOrderItems, true).then(items => {
            this.setState({items});
            this.checkItemStatus();
        });
    };

    checkItemStatus() {
        let shouldPing = false, started = false;
        for (let i = 0; i < this.state.items.length; i++) {
            const itemStatus = this.state.items[i].status;
            if (!isDoneStatus(itemStatus) && itemStatus !== Status.Created)
                shouldPing = true;
            if (itemStatus !== Status.Created)
                started = true;
        }

        this.setState({status: !started ? "Not Started" : shouldPing ? "Active" : "Done"}); 

        if (!shouldPing)
            return; // All of our items are done, so don't bother pinging.
        
        const secondsDelay = 3;
        console.log(`Checking upgrade item status again in ${secondsDelay} seconds`);
        setTimeout(this.fetchItemStatus.bind(this), (secondsDelay) * 1000);
    }

    fetchItemStatus() {
        upgradeItemService.findByUpgrade(this.state.upgrade.id, this.state.sortOrderItems, true).then(items => {
            this.setState({items});
            this.checkItemStatus();
        });
    }
    
    activationHandler = () => {
        if (window.confirm(`Are you sure you want to activate ${this.state.selected.length} request(s)?`)) {
            upgradeItemService.activateItems(this.state.selected).then(() => window.location.reload());
        }
    };

    cancelationHandler = () => {
        if (window.confirm(`Are you sure you want to cancel ${this.state.selected.length} request(s)?`)) {
            upgradeItemService.cancelItems(this.state.selected).then(() => window.location.reload());
        }
    };

    selectionHandler = (selected) => {
        this.setState({selected});
        console.log(JSON.stringify(selected));
    };

    render() {
        let userCanActivate = true;
        let user = JSON.parse(sessionStorage.getItem("user"));
        if (user) {
            userCanActivate = user.enforce_activation_policy === "false" || (this.state.upgrade.created_by != null && this.state.upgrade.created_by !== user.username);
        }
        
        const itemNotes = [];
        if (!userCanActivate) {
            itemNotes.push(<HeaderNote key="activation_warning">Activation is disabled. The same user that scheduled an upgrade cannot activate it.</HeaderNote>)
        } else if (!user || user.enforce_activation_policy === "false") {
            itemNotes.push(<HeaderNote key="activation_warning">Activation policy enforcement is disabled for testing purposes. THIS IS NOT ALLOWED IN PRODUCTION.</HeaderNote>)
        }
    
        const itemActions = [
            {label: "Activate Selected", handler: this.activationHandler.bind(this),
                disabled: this.state.status === "Closed" || this.state.selected.length === 0 || !userCanActivate,
                detail: "Update the selected items to Pending state to proceed with upgrades"},
            {label: "Cancel Selected", handler: this.cancelationHandler.bind(this),
                disabled: this.state.status === "Closed" || this.state.selected.length === 0}
        ];

        let count = this.state.items.length, completed = 0, errors = 0;
        for (let i = 0; i < count; i++) {
            let item = this.state.items[i];
            if (isDoneStatus(item.status)) {
                completed++;
            }
            if (item.status === Status.Failed) {
                errors++;
            }
        }
        return (
            <div>
                <RecordHeader type="Upgrade" icon={UPGRADE_ICON} title={this.state.upgrade.description}>
                    <HeaderField label="Created By" value={this.state.upgrade.created_by}/>
                    <HeaderField label="Scheduled Start Time" format="datetime" value={this.state.upgrade.start_time}/>
                    <HeaderField label="State" value={this.state.status}/>
                </RecordHeader>
                <ProgressBar progress={completed / count} success={errors === 0}/>
                <div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
                    <UpgradeItemCard upgrade={this.state.upgrade} actions={itemActions} notes={itemNotes}
                                     onSelect={this.selectionHandler} items={this.state.items} status={this.state.status}/>
                </div>
            </div>
        );
    }
}