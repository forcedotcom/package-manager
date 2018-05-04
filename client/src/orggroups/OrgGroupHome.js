import React from 'react';

import * as orgGroupService from "../services/OrgGroupService";
import * as sortage from '../services/sortage';

import {HomeHeader} from "../components/PageHeader";
import OrgGroupList from "./OrgGroupList";
import NewOrgGroupWindow from "./NewOrgGroupWindow"

export default class extends React.Component {
    SORTAGE_KEY = "OrgGroupList";

    state = {sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "name", "asc"), orggroups: [], selected: [], itemCount: "..."};

    componentDidMount() {
        orgGroupService.requestAll(this.state.sortOrder).then(orggroups => this.setState({orggroups, itemCount: orggroups.length}));
    }

    filterHandler = (filtered) => {
        this.setState({itemCount: filtered.length});
    };
    
    newHandler = () => {
        this.setState({addingOrgGroup: true});
    };

    editHandler = (orggroup) => {
        window.location = "/orggroup/" + orggroup.id + "/edit";
    };

    saveHandler = (orggroup) => {
        orgGroupService.requestCreate(orggroup).then(() => {
            orgGroupService.requestAll(this.state.sortOrder).then(orggroups => this.setState({orggroups, addingOrgGroup: false}));
        });
    };

    cancelHandler = () => {
        this.setState({addingOrgGroup: false});
    };

    selectionHandler = (selected) => {
        this.setState({selected});
    };
    
    deleteHandler = () => {
        orgGroupService.requestDelete(this.state.selected).then(() => {
            orgGroupService.requestAll(this.state.sortOrder).then(orggroups => this.setState({orggroups}));
        });
    };
    
    render() {
        const actions = [
            {label: "New", handler: this.newHandler, detail: "Create new org group"},
            {label: "Delete", disabled: this.state.selected.length === 0, handler: this.deleteHandler, detail: "Delete the selected groups"}
        ];
        return (
            <div>
                <HomeHeader type="org groups"
                            title="Org Groups"
                            itemCount={this.state.itemCount}
                            actions={actions}/>
                <OrgGroupList orggroups={this.state.orggroups} onFilter={this.filterHandler} onSelect={this.selectionHandler} onDelete={this.deleteHandler} onEdit={this.editHandler}/>
                {this.state.addingOrgGroup ?  <NewOrgGroupWindow onSave={this.saveHandler} onCancel={this.cancelHandler}/> : ""}

            </div>
        );
    }
}