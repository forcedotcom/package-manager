import React from 'react';

import * as upgradeItemService from '../services/UpgradeItemService';

import {RecordHeader, HeaderField, HeaderNote} from '../components/PageHeader';
import UpgradeItemView from "./UpgradeItemView";
import * as sortage from "../services/sortage";
import * as upgradeJobService from "../services/UpgradeJobService";
import {UPGRADE_ITEM_ICON} from "../Constants";
import moment from "moment";

export default class extends React.Component {
    SORTAGE_KEY_JOBS = "UpgradeJobCard";

    state = {
        item: {},
        sortOrderJobs: sortage.getSortOrder(this.SORTAGE_KEY_JOBS, "id", "asc"),
        active: false
    };

    componentDidMount() {
        // Here we pass in true to query for the request status the first time.
        upgradeItemService.requestById(this.props.match.params.itemId, true).then(item => {
            this.loadItemJobs(item);
            this.checkStatus(item);
        });
    };

    loadItemJobs(item) {
        // Note that we don't perform the (expensive) job here.  Only later from checkJobStatus.
        upgradeJobService.requestAllJobs(item.id, this.state.sortOrderJobs).then(jobs => {
            this.setState({item, jobs});
            this.checkJobStatus();
        });
    }

    checkStatus(item) {
        let doneOrNotStarted = upgradeItemService.isDoneStatus(item.status) || item.status === upgradeItemService.Status.Created;
        if(doneOrNotStarted)
            return; // Don't keep pinging until we know we are activated

        const secondsDelay = 3;
        console.log(`Checking upgrade status again in ${secondsDelay} seconds`);
        setTimeout(this.fetchStatus.bind(this), (secondsDelay) * 1000);
    }

    fetchStatus() {
        upgradeItemService.requestById(this.state.item.id, true).then(item => {
            this.setState({item});
            this.checkStatus(item);
        })
    }

    checkJobStatus() {
        let item = this.state.item;
        let notStarted = item.status === upgradeItemService.Status.Created;
        if(notStarted)
            return; // Don't start pinging until we know we are activated

        let foundOne = false;
        for (let i = 0; i < this.state.jobs.length && !foundOne; i++) {
            if (!upgradeItemService.isDoneStatus(this.state.jobs[i].status))
                foundOne = true;
        }
        
        if (!foundOne)
            return; // All of our jobs are done, so don't bother pinging.
        
        // Use a simpleton variable delay based on number of jobs
        const secondsDelay = 5 + this.state.jobs.length / 100;
        console.log(`Checking job status again in ${secondsDelay} seconds`);
        setTimeout(this.fetchJobStatus.bind(this), (secondsDelay) * 1000);
    }

    fetchJobStatus() {
        upgradeJobService.requestAllJobs(this.state.item.id, this.state.sortOrderJobs, true).then(jobs => {
            this.setState({jobs});
            this.checkJobStatus();
        });
    }
    
    handleActivation = () => {
        if (window.confirm(`Are you sure you want to activate this request for ${moment(this.state.item.start_time).format("lll")}?`)) {
            upgradeItemService.activateItems([this.state.item.id]).then(items => this.loadItemJobs(items[0]));
        }
    };

    handleCancelation = () => {
        if (window.confirm(`Are you sure you want to cancel this request?  All ${this.state.jobs.length} orgs will be cancelled.`)) {
            upgradeItemService.cancelItems([this.state.item.id]).then(items => this.loadItemJobs(items[0]));
        }
    };

    render() {
        let user = JSON.parse(sessionStorage.getItem("user"));
        let canActivate = user.enforce_activation_policy === "false" || (this.state.item.created_by != null && this.state.item.created_by !== user.username);
        const notes = [];
        if (!canActivate) {
            notes.push(<HeaderNote key="activation_warning">Activation is disabled. The same user that scheduled an upgrade cannot activate it.</HeaderNote>)
        } else if (user.enforce_activation_policy === "false") {
            notes.push(<HeaderNote key="activation_warning">Activation policy enforcement is disabled for testing purposes. THIS IS NOT ALLOWED IN PRODUCTION.</HeaderNote>)
        }
        
        let actions = [
            {label: "Activate Request", handler:this.handleActivation, disabled: this.state.item.status !== upgradeItemService.Status.Created || !canActivate,
                detail: canActivate ? "Update the selected items to Pending state to proceed with upgrades" : "The same user that scheduled an upgrade cannot activate it"},
            {label: "Cancel Request", handler:this.handleCancelation, disabled: [upgradeItemService.Status.Created, upgradeItemService.Status.Pending].indexOf(this.state.item.status) === -1 }
        ];
        return (
            <div>
                <RecordHeader type="Upgrade Request" icon={UPGRADE_ITEM_ICON} title={this.state.item.description} actions={actions} notes={notes}>
                    <HeaderField label="Start Time" format="datetime" value={this.state.item.start_time}/>
                    <HeaderField label="Status" value={this.state.item.status} className={this.state.item.status === "Done" ? "" : "slds-text-color_success"}/>
                    <HeaderField label="Created By" value={this.state.item.created_by}/>
                </RecordHeader>
                <UpgradeItemView jobs={this.state.jobs}/>
            </div>
        );
    }
}