import React from 'react';

import DataTable from "../components/DataTable";
import {CardHeader} from "../components/PageHeader";
import * as orgGroupService from "../services/OrgGroupService";
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

    addToGroupHandler = (groupId, removeAfterAdd) => {
        this.setState({addingToGroup: false});
        orgGroupService.requestAddMembers(groupId, this.state.selected).then(res => {
            if (removeAfterAdd) {
                this.props.onRemove(this.state.selected);
            }
            window.location = `/orggroup/${groupId}`;
        });
    };

    closeGroupWindow = () => {
        this.setState({addingToGroup: false});
    };

    openGroupWindow = () => {
        this.setState({addingToGroup: true});
    };
    
    openGroupWindowAndMove = () => {
        this.setState({addingToGroup: true, removeAfterAdd: true});
    };
    
    filterHandler = (filtered) => {
        this.setState({itemCount: filtered.length});
    };
    
    render() {
        const columns = [
            {Header: "Org ID", accessor: "org_id", sortable: true, clickable: true, filterable: true},
            {Header: "Account", accessor: "account_name", sortable: true, clickable: true, filterable: true},
            {Header: "Instance", accessor: "instance", sortable: true, filterable: true},
            {Header: "Type", id: "is_sandbox", accessor: d => d.is_sandbox ? "Sandbox" : "Production", sortable: true, filterable: true}
        ];
        
        const actions = [
            {label: "Copy To Group", handler: this.openGroupWindow, disabled: this.state.selected.length === 0},
            {label: "Move To Group", handler: this.openGroupWindowAndMove, disabled: this.state.selected.length === 0},
            {label: "Remove Orgs", handler: this.removeMembersHandler, disabled: this.state.selected.length === 0}];
        
        return (
            <article className="slds-card">
                <CardHeader title="Members" actions={actions} count={this.state.itemCount}/>
                <div className="slds-card__body">
                    <DataTable keyField="org_id" id="OrgCard" data={this.props.orgs} onClick={this.linkHandler}  onFilter={this.filterHandler} onSelect={this.selectionHandler} columns={columns}/>
                </div>
                <footer className="slds-card__footer"/>
                {this.state.addingToGroup ?  <SelectGroupWindow excludeId={this.props.orggroup.id} removeAfterAdd={this.state.removeAfterAdd} onAdd={this.addToGroupHandler.bind(this)} onCancel={this.closeGroupWindow}/> : ""}
            </article>
        );
    }
}