import React from 'react';

import * as orgGroupService from '../services/OrgGroupService';

import DataTable from "../components/DataTable";
import {CardHeader} from "../components/PageHeader";
import SelectGroupWindow from "./SelectGroupWindow";

export default class extends React.Component {
    state = {
        selected: [], itemCount: "..."
    };


    componentWillReceiveProps(props) {
        if (props.orgs) {
            this.setState({itemCount: props.orgs.length});
        }
    };
    
    linkHandler = (e, column, rowInfo) => {
        window.location = "/org/" + rowInfo.row.org_id;
    };

    selectionHandler = (selected) => {
        this.setState({selected});
    };

    removeMembersHandler = () => {
        this.props.onRemove(this.state.selected);
    };

    addToGroupHandler = (groupId, groupName) => {
        this.setState({addingToGroup: false});
        orgGroupService.requestAddMembers(groupId, groupName, this.state.selected).then((orggroup) => {
            window.location = `/orggroup/${orggroup.id}`;
        });
    };

    closeGroupWindow = () => {
        this.setState({addingToGroup: false});
    };

    openGroupWindow = () => {
        this.setState({addingToGroup: true});
    };

    filterHandler = (filtered) => {
        this.setState({itemCount: filtered.length});
    };
    
    render() {
        const columns = [
            {Header: "Org ID", accessor: "org_id", sortable: true, clickable: true},
            {Header: "Account", accessor: "account_name", sortable: true, clickable: true},
            {Header: "Instance", accessor: "instance", sortable: true},
            {Header: "Groups", accessor: "groups", sortable: true},
            {Header: "Version", accessor: "version_number", sortable: true},
            {Header: "Type", id: "is_sandbox", accessor: d => d.is_sandbox ? "Sandbox" : "Production", sortable: true},
            {Header: "Features", accessor: "features", sortable: true}
        ];
        
        const actions = [ 
            {label: "Add To Group", handler: this.openGroupWindow, disabled: this.state.selected.length === 0}
        ];
        if (this.props.onRemove) {
            actions.push({label: "Remove Selected Member Orgs", handler: this.removeMembersHandler, disabled: this.state.selected.length === 0});
        }
        
        return (
            <article className="slds-card">
                <CardHeader title={this.props.title} actions={actions} count={this.state.itemCount}/>
                <div className="slds-card__body">
                    <DataTable keyField="org_id" id="OrgCard" data={this.props.orgs} onClick={this.linkHandler}  onFilter={this.filterHandler} onSelect={this.selectionHandler} columns={columns}/>
                </div>
                <footer className="slds-card__footer"/>
                {this.state.addingToGroup ?  <SelectGroupWindow onAdd={this.addToGroupHandler.bind(this)} onCancel={this.closeGroupWindow}/> : ""}
            </article>
        );
    }
}