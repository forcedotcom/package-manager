import React from 'react';

import * as orgService from '../services/OrgService';
import * as orgGroupService from '../services/OrgGroupService';
import * as sortage from '../services/sortage';

import {HomeHeader} from '../components/PageHeader';
import OrgList from './OrgList';
import SelectGroupWindow from "./SelectGroupWindow";

export default class extends React.Component {
    SORTAGE_KEY = "OrgList";

    state = {view: "grid", sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "account_name", "asc"), orgs: [], selected: [], itemCount: "..."};

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

    filterHandler = (filtered, column, value) => {
        this.setState({itemCount: filtered.length});
    };
    
    addToGroupHandler = (groupId) => {
        this.setState({addingToGroup: false});
        orgGroupService.requestAddMembers(groupId, this.state.selected).then(res => window.location = `/orggroup/${groupId}`);
    };

    closeGroupWindow = () => {
        this.setState({addingToGroup: false});
    };

    openGroupWindow = () => {
        this.setState({addingToGroup: true});
    };
    
    render() {
        const actions = [
            {label: "Add To Group", disabled: this.state.selected.length === 0, handler: this.openGroupWindow},
        ];
        
        return (
            <div>
                <HomeHeader type="orgs" title="Orgs" actions={actions} itemCount={this.state.itemCount}/>
                <OrgList orgs={this.state.orgs} onSort={this.sortHandler} onFilter={this.filterHandler} onSelect={this.selectionHandler}/>
                {this.state.addingToGroup ?  <SelectGroupWindow onAdd={this.addToGroupHandler.bind(this)} onCancel={this.closeGroupWindow}/> : ""}
            </div>
        );
    }
}