import React from 'react';

import * as orgGroupService from '../services/OrgGroupService';

import {RecordHeader, HeaderField} from '../components/PageHeader';
import OrgGroupView from "./OrgGroupView";
import OrgGroupForm from "./OrgGroupForm";
import ScheduleUpgradeWindow from "../orgs/ScheduleUpgradeWindow";
import * as packageVersionService from "../services/PackageVersionService";
import * as sortage from "../services/sortage";
import {ORG_GROUP_ICON} from "../Constants";

export default class extends React.Component {
    SORTAGE_KEY_VERSIONS = "GroupMemberVersionCard";

    state = {
        orggroup: {},
        sortOrderVersions: sortage.getSortOrder(this.SORTAGE_KEY_VERSIONS, "org_id", "asc")
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
        Object.entries(validSet).forEach(async ([key, val]) => {validVersions.push(val)});
        return validVersions.length > 0 ? validVersions : null;
    };

    upgradeHandler = (versions, startDate, description) => {
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
            window.location = '/orggroups';
        }).catch(e => console.error(e));
    };

    editHandler = () => {
        window.location = '/orggroup/' + this.state.orggroup.id + '/edit';
    };

    deleteHandler = () => {
        orgGroupService.requestDelete([this.state.orggroup.id]).then(() => {
            window.location = '/orggroups';
        });
    };

    removeMemberHandler = (selected) => {
        if (window.confirm(`Are you sure you want to remove ${selected.length} member(s)?`)) {
            orgGroupService.requestRemoveMembers(this.state.orggroup.id, selected).then(members => {
                packageVersionService.findByOrgGroupId(this.state.orggroup.id, this.state.sortOrderVersions).then(versions => {
                    let validVersions = this.stripVersions(versions);
                    this.setState({members, versions, validVersions});
                });                
            });
        }
    };

    render() {
        let isEditing = this.props.match.url.indexOf('/edit') !== -1;
        let view = isEditing ?
            <OrgGroupForm orggroup={this.state.orggroup} saveHandler={this.saveHandler}/> :
            <OrgGroupView orggroup={this.state.orggroup} versions={this.state.versions} members={this.state.members} onRemoveMember={this.removeMemberHandler}/>;
        let actions = [
            {handler:this.schedulingWindowHandler, label:"Upgrade Packages", group:"upgrade", disabled: !this.state.validVersions}, 
            {handler:this.editHandler, label:"Edit"}, 
            {handler:this.deleteHandler, label:"Delete"}];
        return (
            <div>
                <RecordHeader type="Org Group" icon={ORG_GROUP_ICON} title={this.state.orggroup.name} actions={actions}>
                    <HeaderField label="" value={this.state.orggroup.description}/>
                </RecordHeader>
                {view}
                {this.state.schedulingUpgrade ?  <ScheduleUpgradeWindow org={this.state.org} versions={this.state.validVersions} onUpgrade={this.upgradeHandler.bind(this)} onCancel={this.cancelSchedulingHandler}/> : ""}
            </div>
        );
    }
}