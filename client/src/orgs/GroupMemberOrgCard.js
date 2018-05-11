import React from 'react';

import DataTable from "../components/DataTable";
import {CardHeader} from "../components/PageHeader";

export default class extends React.Component {
    state = {itemCount: "..."};

    componentWillReceiveProps(props) {
        if (props.orgs) {
            this.setState({itemCount: props.orgs.length});
        }
    };
    
    linkHandler = (e, column, rowInfo) => {
        window.location = "/org/" + rowInfo.row.org_id;
    };

    filterHandler = (filtered) => {
        this.setState({itemCount: filtered.length});
    };
    
    render() {
        const columns = [
            {Header: "Org ID", accessor: "org_id", sortable: true, clickable: true},
            {Header: "Account", accessor: "account_name", sortable: true, clickable: true},
            {Header: "Instance", accessor: "instance", sortable: true},
            {Header: "Type", id: "is_sandbox", accessor: d => d.is_sandbox ? "Sandbox" : "Production", sortable: true},
            {Header: "Groups", accessor: "groups", sortable: true}
        ];
        
        return (
            <article className="slds-card">
                <CardHeader title="Members" actions={this.props.actions} count={this.state.itemCount}/>
                <div className="slds-card__body">
                    <DataTable keyField="org_id" id="OrgCard" data={this.props.orgs} columns={columns} 
                               onClick={this.linkHandler} onFilter={this.filterHandler} onSelect={this.props.onSelect}/>
                </div>
                <footer className="slds-card__footer"/>
            </article>
        );
    }
}