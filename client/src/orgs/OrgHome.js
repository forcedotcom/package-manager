import React from 'react';
import {NotificationManager} from 'react-notifications';

import * as orgService from '../services/OrgService';
import * as orgGroupService from '../services/OrgGroupService';
import * as sortage from '../services/sortage';

import {HomeHeader} from '../components/PageHeader';
import OrgList from './OrgList';
import SelectGroupWindow from "./SelectGroupWindow";
import AddOrgWindow from "../orggroups/AddOrgWindow";

export default class extends React.Component {
    SORTAGE_KEY = "OrgList";

    state = {view: "grid", sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "account_name", "asc"), orgs: [], selected: []};

    componentDidMount() {
        orgService.requestAll(this.state.sortOrder)
            .then(orgs => {this.setState({orgs, itemCount: orgs.length})})
            .catch(err => console.error(err));
    }

    sortHandler = (field) => {
        let sortOrder = sortage.changeSortOrder(this.SORTAGE_KEY, field);
        orgService.requestAll(sortOrder).then(orgs => {
            this.setState({sortOrder, orgs})
        });
    };

    selectionHandler = (selected) => {
        this.setState({selected});
    };

    filterHandler = (filtered) => {
        this.setState({itemCount: filtered.length});
    };

    saveHandler = (orgIds) => {
        orgService.requestAdd(orgIds).then((orgs) => {
            this.setState({isAdding: false, orgs, itemCount: orgs.length});
        }).catch(e => console.error(e));
    };

    addingHandler = () => {
        this.setState({isAdding: true});
    };

    cancelHandler = () => {
        this.setState({isAdding: false});
    };

    addToGroup = (groupId, groupName) => {
        this.setState({addingToGroup: false});
        orgGroupService.requestAddMembers(groupId, this.state.selected).then(() => {
            NotificationManager.success(`Added ${this.state.selected.length} org(s) to ${groupName}`, "Added orgs", 5000, ()=> window.location = `/orggroup/${groupId}`);
            this.setState({selected: []});
        });
    };

    cancelAddingToGroupHandler = () => {
        this.setState({addingToGroup: false});
    };

    addingToGroupHandler = () => {
        this.setState({addingToGroup: true});
    };
    
    render() {
        const actions = [
            {label: "Add To Group", group: "selectable", disabled: this.state.selected.length === 0, handler: this.addingToGroupHandler},
            {label: "Import", handler: this.addingHandler}
        ];
        
        return (
            <div>
                <HomeHeader type="orgs" title="Orgs" actions={actions} itemCount={this.state.itemCount}/>
                <OrgList orgs={this.state.orgs} onSort={this.sortHandler} onFilter={this.filterHandler} onSelect={this.selectionHandler}/>
                {this.state.addingToGroup ?  <SelectGroupWindow onAdd={this.addToGroup.bind(this)} onCancel={this.cancelAddingToGroupHandler}/> : ""}
                {this.state.isAdding ?  <AddOrgWindow onSave={this.saveHandler} onCancel={this.cancelHandler}/> : ""}
            </div>
        );
    }
}