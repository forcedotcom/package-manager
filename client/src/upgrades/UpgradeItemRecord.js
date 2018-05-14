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
        upgradeItemService.requestById(this.props.match.params.itemId).then(item => this.setState({item}));
        upgradeJobService.findByUpgradeItem(this.props.match.params.itemId, this.state.sortOrderJobs).then(jobs => {
            this.setState({jobs});
            this.fetchStatus();
        });
    };

    fetchStatus() {
        upgradeJobService.fetchJobStatusByItem(this.state.item.id).then(res => this.updateStatus(res))
    }

    updateStatus(res) {
        let done = true;
        const {item, jobs} = this.state;
        for (let i = 0; i < jobs.length; i++) {
            const j = jobs[i];
            j.status = res.status[j.job_id] || j.status;
            let error = res.errors[j.job_id];
            if (error) {
                j.status = error.title;
                j.error = error;
            }
            
            if (["Created", "Pending", "InProgress"].indexOf(j.status) !== -1) {
                done = false;
            }
        }
        this.setState({item, jobs, status: done ? "Closed" : "Open"});
        if (!done) {
            setTimeout(this.fetchStatus.bind(this), 3000);
        }
    }

    jobSortHandler = (field) => {
        let sortOrder = sortage.changeSortOrder(this.SORTAGE_KEY_JOBS, field);
        upgradeJobService.findByUpgradeItem(this.props.item.id, sortOrder).then(jobs => this.setState({jobs, sortOrderJobs: sortOrder}));
    };

    handleActivation = () => {
        if (window.confirm(`Are you sure you want to activate this request for ${moment(this.state.item.start_time).format("lll")}?`)) {
            upgradeItemService.activateById(this.state.item.id).then(res => window.location.reload());
        }
    };

    handleCancelation = () => {
        if (window.confirm(`Are you sure you want to cancel this request?`)) {
            upgradeItemService.cancelById(this.state.item.id).then(res => window.location.reload());
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
            {label: "Activate Request", handler:this.handleActivation, disabled: this.state.item.status !== 'Created' || !canActivate,
                detail: canActivate ? "Update the selected items to Pending state to proceed with upgrades" : "The same user that scheduled an upgrade cannot activate it"},
            {label: "Cancel Request", handler:this.handleCancelation, disabled: ["Created", "Pending"].indexOf(this.state.item.status) === -1 }
        ];
        return (
            <div>
                <RecordHeader type="Upgrade Request" icon={UPGRADE_ITEM_ICON} title={this.state.item.description} actions={actions} notes={notes}>
                    <HeaderField label="Start Time" format="datetime" value={this.state.item.start_time}/>
                    <HeaderField label="Status" value={this.state.item.status}/>
                    <HeaderField label="Created By" value={this.state.item.created_by}/>
                </RecordHeader>
                <UpgradeItemView onSort={this.jobSortHandler} jobs={this.state.jobs}/>
            </div>
        );
    }
}