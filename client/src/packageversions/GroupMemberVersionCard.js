import React from 'react';

import DataTable from "../components/DataTable";
import moment from "moment/moment";
import {CardHeader} from "../components/PageHeader";
import {PACKAGE_VERSION_ICON} from "../Constants";

export default class extends React.Component {
    state = {selected: [], itemCount: "..."};

    linkHandler = (e, column, rowInfo) => {
        switch (column.id) {
            case "org_id":
            case "account_name":
                window.location = "/org/" + rowInfo.row.org_id;
                break;
            case "package_name":
                window.location = "/package/" + rowInfo.original.package_id;
                break;
            case "version_number":
                window.location = "/packageversion/" + rowInfo.original.latest_version_id;
                break;
            default:
        }
    };

    componentWillReceiveProps(props) {
        if (props.packageVersions) {
            this.setState({itemCount: props.packageVersions.length});
        }
    };
    
    selectionHandler = (selected) => {
        this.setState({selected});
    };

    removeMembersHandler = () => {
        this.props.onRemove(this.state.selected);
    };


    filterHandler = (filtered, column, value) => {
        this.setState({itemCount: filtered.length});
    };

    render() {
        let columns = [
            {Header: "Org ID", accessor: "org_id", sortable: true, clickable: true},
            {Header: "Account Name", accessor: "account_name", clickable: true},
            {Header: "Package", accessor: "package_name", clickable: true},
            {Header: "License Status", accessor: "license_status"},
            {Header: "Version Number", minWidth: 170, id: "version_number", accessor: d => d.version_number === d.latest_version_number ? d.version_number :
                    <span style={{borderRadius: "4px", margin: 0, fontWeight: "bold", padding: "2px 4px 2px 4px"}} className="slds-theme--success">{d.version_number}&nbsp;&nbsp;=&gt;&nbsp;&nbsp;{d.latest_version_number}</span>, sortable: true, clickable: true},
            {Header: "Status", accessor: "status", sortable: true},
            {Header: "Release Date", id: "release_date", accessor: d => moment(d.release_date).format("ll")},
        ];

        const actions = [];
        if (this.props.onRemove) {
            actions.push({label: "Remove Selected Orgs", handler: this.removeMembersHandler, disabled: this.state.selected.length === 0});
        }

        return (
            <div className="slds-card">
                <CardHeader title="Installed Versions" icon={PACKAGE_VERSION_ICON} actions={actions} count={this.state.itemCount}/>
                <section className="slds-card__body">
                    <DataTable keyField="org_id" id="GroupMemberVersionCard" data={this.props.packageVersions} columns={columns} 
                               onSelect={this.selectionHandler} onClick={this.linkHandler} onFilter={this.filterHandler}/>
                </section>
                <footer className="slds-card__footer"></footer>
            </div>
        );
    }
}