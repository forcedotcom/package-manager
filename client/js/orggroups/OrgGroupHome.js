import React from 'react';

import {HomeHeader} from "../components/PageHeader";
import OrgGroupList from "./OrgGroupList";
import * as orgGroupService from "../services/OrgGroupService";
import NewOrgGroupWindow from "./NewOrgGroupWindow"

export default React.createClass({

    getInitialState() {
        return {sortOrder: "name", orggroups: []};
    },

    componentDidMount() {
        orgGroupService.requestAll(this.state.sortOrder).then(orggroups => this.setState({orggroups}));
    },

    sortHandler(sortOrder) {
        orgGroupService.requestAll(sortOrder).then(orggroups => {
            this.setState({sortOrder, orggroups})
        });
    },

    newHandler() {
        this.setState({addingOrgGroup: true});
    },

    editHandler(data) {
        window.location.hash = "#orggroup/" + data.id + "/edit";
    },

    saveHandler(orggroup) {
        orgGroupService.requestCreate(orggroup).then(() => {
            orgGroupService.requestAll().then(orggroups => this.setState({addingOrgGroup: false, orggroups}));
        });
    },

    cancelHandler() {
        this.setState({addingOrgGroup: false});
    },

    deleteHandler(data) {
        orgGroupService.requestDelete(data.id).then(() => {
            orgGroupService.requestAll(this.state.sort).then(orggroups => this.setState({orggroups}));
        });
    },

    render() {
        return (
            <div>
                <HomeHeader type="org groups"
                            title="Org Groups"
                            actions={[]}
                            itemCount={this.state.orggroups.length}
                            viewOptions={[{value:"table", label:"Table", icon:"table"}]}
                            sortOptions={[{value:"name", label:"Name"}]}
                            onNew={this.newHandler}
                            onSort={this.sortHandler}/>
                <OrgGroupList orggroups={this.state.orggroups} onSort={this.sortHandler} onDelete={this.deleteHandler} onEdit={this.editHandler}/>
                {this.state.addingOrgGroup ?  <NewOrgGroupWindow onSave={this.saveHandler} onCancel={this.cancelHandler}/> : ""}

            </div>
        );
    }
});