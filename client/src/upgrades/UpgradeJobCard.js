import React from 'react';
import ReactTooltip from 'react-tooltip';

import DataTable from "../components/DataTable";
import {CardHeader} from "../components/PageHeader";
import {UPGRADE_JOB_ICON} from "../Constants";

export default class extends React.Component {
    state = {done: false, itemCount: "..."};
    
    linkHandler = (e, column, rowInfo, instance) => {
        switch(column.id) {
            case "org_id":
            case "account_name":
                window.location = "/org/" + rowInfo.original.org_id;
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
        if(props.jobs) {
            this.setState({itemCount: props.jobs.length});
        }
    }

    filterHandler = (filtered, column, value) => {
        this.setState({itemCount: filtered.length});
    };
    
    render() {
        let columns = [
            {Header: "Org ID", accessor: "org_id", clickable: true, maxWidth: 200, filterable: true},
            {Header: "Account", accessor: "account_name", sortable: true, clickable: true, maxWidth: 400, filterable: true},
            {Header: "Package Name", accessor: "package_name", sortable: true, clickable: true, maxWidth: 300, filterable: true},
            {Header: "Version", accessor: "version_number", sortable: true, clickable: true, maxWidth: 100, filterable: true},
            {Header: "Status", accessor: "status", sortable: true, filterable: true,
                Cell: row => (
                    <div data-tip data-for={row.org_id}>
                        <span style={{
                        padding: "2px 10px 2px 10px",
                        backgroundColor: row.original.error ? "#C00" : "inherit",
                        color: row.original.error ? "white" : "inherit",
                        borderRadius: '10px',
                        transition: 'all .3s ease-in'}}>
                            {row.value ? row.value : "Retrieving Status..."}</span>
                        {row.original.error ? 
                            <ReactTooltip id={row.org_id} place="bottom" type="error">
                                {row.original.error.message}
                            </ReactTooltip>
                        : ""}
                    </div>
                )
            }
        ];

        return (
            <div className="slds-card">
                <CardHeader title="Upgrade Jobs" icon={UPGRADE_JOB_ICON} count={this.state.itemCount}/>
                <section className="slds-card__body">
                    <DataTable id="UpgradeJobCard" minRows="1" data={this.props.jobs} onFilter={this.filterHandler} onClick={this.linkHandler} columns={columns}/>
                </section>
                <footer className="slds-card__footer"></footer>
            </div>
        );
    }
}