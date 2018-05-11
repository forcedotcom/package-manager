import React from 'react';

import DataTable from "../components/DataTable";
import {CardHeader} from "../components/PageHeader";

export default class extends React.Component {
    state = {
        selected: [], itemCount: "..."
    };


    componentWillReceiveProps(props) {
        if (props.orgs) {
            this.setState({itemCount: props.orgs.length});
        }
    };
    
    linkHandler = (e, column, rowInfo, instance) => {
        window.location = "/org/" + rowInfo.row.org_id;
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
        const columns = [
            {Header: "Org ID", accessor: "org_id", sortable: true, clickable: true, filterable: true},
            {Header: "Account", accessor: "account_name", sortable: true, clickable: true, filterable: true},
            {Header: "Instance", accessor: "instance", sortable: true, filterable: true},
            {Header: "Groups", accessor: "group_name", sortable: true, filterable: true},
            {Header: "Type", id: "is_sandbox", accessor: d => d.is_sandbox ? "Sandbox" : "Production", sortable: true, filterable: true}
        ];
        
        const actions = [];
        if (this.props.onRemove) {
            actions.push({label: "Remove Selected Member Orgs", handler: this.removeMembersHandler, disabled: this.state.selected.length === 0});
        }
        
        return (
            <article className="slds-card">
                <CardHeader title={this.props.title} actions={actions} count={this.state.itemCount}/>
                <div className="slds-card__body">
                    <DataTable keyField="org_id" id="OrgCard" data={this.props.orgs} onClick={this.linkHandler}  onFilter={this.filterHandler} onSelect={this.selectionHandler} columns={columns}/>
                </div>
                <footer className="slds-card__footer"></footer>
            </article>
        );
    }
}