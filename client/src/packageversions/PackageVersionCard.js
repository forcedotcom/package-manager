import React from 'react';

import moment from "moment/moment";
import DataTable from "../components/DataTable";
import {CardHeader} from "../components/PageHeader";
import {PACKAGE_VERSION_ICON} from "../Constants";

export default class extends React.Component {
    state = {itemCount: "..."};

    linkHandler = (e, column, rowInfo) => {
        window.location = "/packageversion/" + rowInfo.original.version_id;
    };

    componentWillReceiveProps(props) {
        if(props.packageVersions) {
            this.setState({itemCount: props.packageVersions.length});
        }
    }

    filterHandler = (filtered, column, value) => {
        this.setState({itemCount: filtered.length});
    };
    
    render() {
        let columns = [
            {Header: "Version Number", accessor: "version_number", sortable: true, clickable: true},
            {Header: "Release Date", id: "release_date", accessor: d => moment(d.release_date).format("ll"), sortable: true},
            {Header: "Version ID", accessor: "version_id"},
            {Header: "Status", accessor: "status", sortable: true}
        ];
        
        return (
            <div className="slds-card">
                <CardHeader title="Package Versions" icon={PACKAGE_VERSION_ICON} count={this.state.itemCount}/>
                <section className="slds-card__body">
                    <DataTable id="PackageVersionCard" data={this.props.packageVersions} onFilter={this.filterHandler} onClick={this.linkHandler} columns={columns}/>
                </section>
                <footer className="slds-card__footer"></footer>
            </div>
        );
    }
}