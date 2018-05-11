import React from 'react';

import * as orgGroupService from '../services/OrgGroupService';
import * as packageVersionService from "../services/PackageVersionService";
import * as sortage from "../services/sortage";

import {NotificationManager} from 'react-notifications';
import {RecordHeader, HeaderField} from '../components/PageHeader';
import OrgGroupView from "./OrgGroupView";
import EditGroupWindow from "./EditGroupWindow";
import ScheduleUpgradeWindow from "../orgs/ScheduleUpgradeWindow";
import {ORG_GROUP_ICON} from "../Constants";
import SelectGroupWindow from "../orgs/SelectGroupWindow";

export default class extends React.Component {
    SORTAGE_KEY_VERSIONS = "GroupMemberVersionCard";

    state = {
        isEditing: false,
        orggroup: {},
        sortOrderVersions: sortage.getSortOrder(this.SORTAGE_KEY_VERSIONS, "org_id", "asc"),
        selected: [],
    };

    componentDidMount() {
        orgGroupService.requestById(this.props.match.params.orgGroupId).then(orggroup => {
            orgGroupService.requestMembers(orggroup.id).then(members => this.setState({orggroup, members}));
        });
        packageVersionService.findByOrgGroupId(this.props.match.params.orgGroupId, this.state.sortOrderVersions).then(versions => {
            let validVersions = this.stripVersions(versions);
            this.setState({versions, validVersions});
        });
    }
    
    stripVersions = (versions) => {
        let validSet = {};
        for (let i = 0; i < versions.length; i++) {
            let v = versions[i];
            if(!validSet[v.package_id] && v.license_status !== 'Uninstalled' && v.license_status !== 'Suspended'
                && v.version_id !== v.latest_version_id) {
                validSet[v.package_id] = v;
            }
        }
        const validVersions = [];
        Object.entries(validSet).forEach(([key, val]) => {validVersions.push(val)});
        return validVersions.length > 0 ? validVersions : null;
    };

    upgradeHandler = (versions, startDate, description) => {
        this.setState({schedulingUpgrade: false});
        orgGroupService.requestUpgrade(this.state.orggroup.id, versions.map(v => v.latest_version_id), startDate, description).then((upgrade) => {
            window.location = `/upgrade/${upgrade.id}`;
        });
    };

    cancelSchedulingHandler = () => {
        this.setState({schedulingUpgrade: false});
    };

    schedulingWindowHandler = () => {
        this.setState({schedulingUpgrade: true});
    };


    saveHandler = (orggroup) => {
        orgGroupService.requestUpdate(orggroup).then(() => {
            this.setState({orggroup, isEditing: false});
            if (orggroup.orgIds.length !== 0) {
                // Reload our kids because our membership may have changed
                orgGroupService.requestMembers(orggroup.id).then(members => this.setState({members}));
                packageVersionService.findByOrgGroupId(orggroup.id, this.state.sortOrderVersions).then(versions => {
                    let validVersions = this.stripVersions(versions);
                    this.setState({versions, validVersions});
                });

            }
        }).catch(e => console.error(e));
    };
    
    editHandler = () => {
        this.setState({isEditing: true});
    };

    cancelHandler = () => {
        this.setState({isEditing: false});
    };

    deleteHandler = () => {
        orgGroupService.requestDelete([this.state.orggroup.id]).then(() => {
            window.location = '/orggroups';
        });
    };

    removeMembersHandler = () => {
        if (window.confirm(`Are you sure you want to remove ${this.state.selected.length} member(s)?`)) {
            orgGroupService.requestRemoveMembers(this.state.orggroup.id, this.state.selected).then(members => {
                packageVersionService.findByOrgGroupId(this.state.orggroup.id, this.state.sortOrderVersions).then(versions => {
                    let validVersions = this.stripVersions(versions);
                    this.setState({members, versions, validVersions});
                });                
            });
            return true;
        }
        return false;
    };

    addToGroupHandler = (groupId, groupName, removeAfterAdd) => {
        this.setState({addingToGroup: false});
        orgGroupService.requestAddMembers(groupId, this.state.selected).then(res => {
            let moved = false;
            if (removeAfterAdd) {
                moved = this.removeMembersHandler();
            }
            if (moved) {
                NotificationManager.success(`Moved ${this.state.selected.length} org(s) to ${groupName}`, "Moved orgs", 5000, ()=> window.location = `/orggroup/${groupId}`);
            } else {
                NotificationManager.success(`Added ${this.state.selected.length} org(s) to ${groupName}`, "Added orgs", 5000, ()=> window.location = `/orggroup/${groupId}`);
            }
            this.setState({selected: [], removeAfterAdd: false});
        });
    };

    closeGroupWindow = () => {
        this.setState({addingToGroup: false});
    };

    addingToGroupHandler = () => {
        this.setState({addingToGroup: true});
    };

    movingToGroupHandler = () => {
        this.setState({addingToGroup: true, removeAfterAdd: true});
    };

    selectionHandler = (selected) => {
        this.setState({selected});
    };

    render() {
        let actions = [
            {handler:this.schedulingWindowHandler, label:"Upgrade Packages", group:"upgrade", disabled: !this.state.validVersions}, 
            {handler:this.editHandler, label:"Edit"}, 
            {handler:this.deleteHandler, label:"Delete"}];

        let memberActions = [
            {label: "Copy To Group", handler: this.addingToGroupHandler, disabled: this.state.selected.length === 0},
            {label: "Move To Group", handler: this.movingToGroupHandler, disabled: this.state.selected.length === 0},
            {label: "Remove Orgs", group: "remove", handler: this.removeMembersHandler, disabled: this.state.selected.length === 0}];
        
        return (
            <div>
                <RecordHeader type="Org Group" icon={ORG_GROUP_ICON} title={this.state.orggroup.name} actions={actions}>
                    <HeaderField label="" value={this.state.orggroup.description}/>
                </RecordHeader>
                <OrgGroupView orggroup={this.state.orggroup} versions={this.state.versions} members={this.state.members} 
                              onSelect={this.selectionHandler} memberActions={memberActions} />;
                {this.state.isEditing ?  <EditGroupWindow orggroup={this.state.orggroup} onSave={this.saveHandler} onCancel={this.cancelHandler}/> : ""}
                {this.state.schedulingUpgrade ?  <ScheduleUpgradeWindow versions={this.state.validVersions} onUpgrade={this.upgradeHandler.bind(this)} onCancel={this.cancelSchedulingHandler}/> : ""}
                {this.state.addingToGroup ?  <SelectGroupWindow excludeId={this.state.orggroup.id} removeAfterAdd={this.state.removeAfterAdd} onAdd={this.addToGroupHandler.bind(this)} onCancel={this.closeGroupWindow}/> : ""}
            </div>
        );
    }
}