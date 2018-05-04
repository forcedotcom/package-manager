import React from 'react';

import DataTable from "../components/DataTable";
import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {UPGRADE_ITEM_ICON} from "../Constants";
import * as upgradeItemService from "../services/UpgradeItemService";

export default class extends React.Component {
    state = {selected: [], itemCount: "..."};


    linkHandler = (e, column, rowInfo, instance) => {
        switch(column.id) {
            case "start_time":
                window.location = "/upgradeitem/" + rowInfo.original.id;
                break;
            case "package_name":
                window.location = "/package/" + rowInfo.original.package_id;
                break;
            case "version_number":
                window.location = "/packageversion/" + rowInfo.original.version_id;
                break;
            default:
                // Nothing...
        }
    };

    componentWillReceiveProps(props) {
        if(props.items) {
            this.setState({itemCount: props.items.length});
        }
    }
    
    activationHandler = () => {
        if (window.confirm(`Are you sure you want to activate ${this.state.selected.length} request(s)?`)) {
            upgradeItemService.activateItems(this.state.selected).then(res => window.location.reload());
        }
    };

    cancelationHandler = () => {
        if (window.confirm(`Are you sure you want to cancel ${this.state.selected.length} request(s)?`)) {
            upgradeItemService.cancelItems(this.state.selected).then(res => window.location.reload());
        }
    };

    selectionHandler = (selected) => {
        this.setState({selected});
        console.log(JSON.stringify(selected));
    };

    filterHandler = (filtered, column, value) => {
        this.setState({itemCount: filtered.length});
    };
    
    render() {
        let columns = [
            {Header: "Start Time", id: "start_time", accessor: d => moment(d.start_time).format("lll"), sortable: true, clickable: true},
            {Header: "Package Name", accessor: "package_name", sortable: true, clickable: true},
            {Header: "Package Version", accessor: "version_number", sortable: true, clickable: true},
            {Header: "Orgs", accessor: "job_count", sortable: true},
            {Header: "Status", accessor: "status", sortable: true,
                Cell: row => (
                    <div>
                    <span style={{
                        padding: "2px 10px 2px 10px",
                        backgroundColor: row.value === "Failed" ? "#C00" : row.value === "Canceled" ? "#d0a600" : "inherit",
                        color: (row.value === "Failed" || row.value === "Canceled") ? "white" : "inherit",
                        borderRadius: '10px',
                        transition: 'all .3s ease-in'}}>
                        {row.value}
                    </span>
                    </div>
                )
            }
        ];

        const actions = [
            {label: "Activate Selected", disabled: this.props.status === "Closed" || this.state.selected.length === 0, handler: this.activationHandler},
            {label: "Cancel Selected", disabled: this.props.status === "Closed" || this.state.selected.length === 0, handler: this.cancelationHandler}
        ];

        return (
            <div className="slds-card">
                <CardHeader title="Upgrade Requests" icon={UPGRADE_ITEM_ICON} actions={actions} count={this.state.itemCount}/>
                <section className="slds-card__body">
                    <DataTable id="UpgradeItemCard" data={this.props.items} onClick={this.linkHandler} onFilter={this.filterHandler} onSelect={this.selectionHandler} columns={columns}/>
                </section>
                <footer className="slds-card__footer"></footer>
            </div>
        );
    }
}