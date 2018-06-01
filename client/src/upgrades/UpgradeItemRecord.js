import React from 'react';

import * as upgradeItemService from '../services/UpgradeItemService';

import {RecordHeader, HeaderField, HeaderNote} from '../components/PageHeader';
import * as sortage from "../services/sortage";
import * as upgradeJobService from "../services/UpgradeJobService";
import {isDoneStatus, Status, UPGRADE_ITEM_ICON} from "../Constants";
import moment from "moment";
import UpgradeJobCard from "./UpgradeJobCard";
import * as Constants from "../Constants";
import ProgressBar from "../components/ProgressBar";
import {NotificationManager} from "react-notifications";

export default class extends React.Component {
    SORTAGE_KEY_JOBS = "UpgradeJobCard";

    state = {
        item: {},
        sortOrderJobs: sortage.getSortOrder(this.SORTAGE_KEY_JOBS, "id", "asc"),
        active: false,
        jobs: []
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
            this.setState({item, jobs, isCanceling: false, isActivating: false});
            this.checkJobStatus();
        });
    }

    checkStatus(item) {
        let doneOrNotStarted = isDoneStatus(item.status) || item.status === Status.Created;
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
        }).catch(e => NotificationManager.error(e.message, "Fetch Failed"));
    }

    checkJobStatus() {
        let item = this.state.item;
        let notStarted = item.status === Status.Created;
        if(notStarted)
            return; // Don't start pinging until we know we are activated

        let foundOne = false;
        for (let i = 0; i < this.state.jobs.length && !foundOne; i++) {
            const job = this.state.jobs[i];
            if (!isDoneStatus(job.status))
                foundOne = true;
            else if (job.status === Status.Succeeded && job.current_version_number !== job.version_number)
                foundOne = true;
        }
        
        if (!foundOne)
            return; // All of our jobs are done, so don't bother pinging.
        
        // Use a simpleton variable delay based on number of jobs
        const secondsDelay = 5 + this.state.jobs.length / 100;
        console.log(`Checking job status again in ${secondsDelay} seconds`);
        setTimeout(this.fetchJobStatus.bind(this), (secondsDelay) * 1000);
    }

    fetchJobStatus = () => {
        this.setState({isFetchingStatus: true});
        upgradeJobService.requestAllJobs(this.state.item.id, this.state.sortOrderJobs, true).then(jobs => {
            this.setState({jobs, isFetchingStatus: false});
            this.checkJobStatus();
        }).catch(e => {
            this.setState({isFetchingStatus: false});
            NotificationManager.error(e.message, "Fetch Failed");
        });
    };

    handleActivation = () => {
        if (window.confirm(`Are you sure you want to activate this request for ${moment(this.state.item.start_time).format("lll")}?`)) {
            this.setState({isActivating: true});
            upgradeItemService.activateItems([this.state.item.id]).then(items => this.loadItemJobs(items[0]))
                .catch(e => {
                    this.setState({isActivating: true});
                    NotificationManager.error(e.message, "Activation Failed");
                });
        }
    };

    handleCancellation = () => {
        if (window.confirm(`Are you sure you want to cancel this request?  All ${this.state.jobs.length} orgs will be cancelled.`)) {
            this.setState({isCancelling: true});
            upgradeItemService.cancelItems([this.state.item.id]).then(items => this.loadItemJobs(items[0]))
                .catch(e => {
                    this.setState({isCancelling: true});
                    NotificationManager.error(e.message, "Cancellation Failed");
                });
        }
    };

    render() {
        let canActivate = true;
        let user = JSON.parse(sessionStorage.getItem("user"));
        if (user) {
            canActivate = user.enforce_activation_policy === "false" || (this.state.item.created_by != null && this.state.item.created_by !== user.username);
        }
        const notes = [];
        if (!canActivate) {
            notes.push(<HeaderNote key="activation_warning">Activation is disabled. The same user that scheduled an upgrade cannot activate it.</HeaderNote>)
        } else if (!user || user.enforce_activation_policy === "false") {
            notes.push(<HeaderNote key="activation_warning">Activation policy enforcement is disabled for testing purposes. THIS IS NOT ALLOWED IN PRODUCTION.</HeaderNote>)
        }
        
        let actions = [
            {label: "Fetch Status", handler:this.fetchJobStatus, spinning: this.state.isFetchingStatus, disabled: !Constants.isDoneStatus(this.state.item.status),
                detail: "Click to refresh the upgrade status and org installed version information.  Only allowed after the upgrade request is marked as complete."},
            {label: "Activate Request", handler:this.handleActivation, spinning: this.state.isActivating, disabled: this.state.item.status !== Status.Created || !canActivate,
                detail: canActivate ? "Update the selected items to Pending state to proceed with upgrades" : "The same user that scheduled an upgrade cannot activate it"},
            {label: "Cancel Request", handler:this.handleCancellation, spinning: this.state.isCancelling, disabled: [Status.Created, Status.Pending].indexOf(this.state.item.status) === -1 }
        ];
        
        let count = this.state.jobs.length, completed = 0, errors = 0;
        for (let i = 0; i < count; i++) {
            let job = this.state.jobs[i];
            if (isDoneStatus(job.status)) {
                completed++;
            }
            if (job.status === Status.Failed) {
                errors++;
            }
        }
        return (
            <div>
                <RecordHeader type="Upgrade Request" icon={UPGRADE_ITEM_ICON} title={this.state.item.description} actions={actions} notes={notes}>
                    <HeaderField label="Start Time" format="datetime" value={this.state.item.start_time}/>
                    <HeaderField label="Status" value={this.state.item.status} className={this.state.item.status === "Done" ? "" : "slds-text-color_success"}/>
                    <HeaderField label="Created By" value={this.state.item.created_by}/>
                </RecordHeader>
                <ProgressBar progress={completed / count} success={errors === 0}/>
                <div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
                    <UpgradeJobCard jobs={this.state.jobs}/>
                </div>
            </div>
        );
    }
}