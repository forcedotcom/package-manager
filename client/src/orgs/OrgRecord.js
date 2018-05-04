import React from 'react';


import * as orgService from '../services/OrgService';
import * as packageVersionService from "../services/PackageVersionService";

import {HeaderField, RecordHeader} from '../components/PageHeader';
import OrgView from "./OrgView";
import ScheduleUpgradeWindow from "./ScheduleUpgradeWindow";
import {ORG_ICON} from "../Constants";
import * as orgGroupService from "../services/OrgGroupService";
import SelectGroupWindow from "./SelectGroupWindow";

const ALLOWED_ORGS = ['00D0q000000CxI3', '00D37000000KnsY', '00D37000000Knsn', '00D1I000001dehP', '00Dj0000000JprU', '00D0m0000008dxK'];

export default class extends React.Component {
    state = { org: {} };

    upgradeHandler = (versions, startDate, description) => {
        if (ALLOWED_ORGS.indexOf(this.state.org.org_id) === -1) {
            window.alert(`${this.state.org.org_id} is not in ALLOWED_ORGS`);
            return;
        }
        orgService.requestUpgrade(this.state.org.org_id, versions.map(v => v.latest_version_id), startDate, description).then((upgrade) => {
            window.location = `/upgrade/${upgrade.id}`;
        });
    };

    closeSchedulerWindow = () => {
        this.setState({schedulingUpgrade: false});
    };

    openSchedulerWindow = () => {
        this.setState({schedulingUpgrade: true});
    };

    componentDidMount() {
        orgService.requestById(this.props.match.params.orgId).then(org => this.setState({org}));
        packageVersionService.findByLicensedOrgId(this.props.match.params.orgId).then(versions => {
            let validVersions = this.stripInvalidVersions(versions);
            this.setState({versions, validVersions});
        });
    }

    stripInvalidVersions = (versions) => {
        let valid = [];
        for (let i = 0; i < versions.length; i++) {
            let v = versions[i];
            if(v.license_status !== 'Uninstalled' && v.license_status !== 'Suspended'
                && v.version_id !== v.latest_version_id) {
                valid.push(v);
            }
        }
        return valid.length > 0 ? valid : null;
    };

    addToGroupHandler = (groupId) => {
        this.setState({addingToGroup: false});
        orgGroupService.requestAddMembers(groupId, [this.state.org.org_id]).then(res => window.location = `/orggroup/${groupId}`);
    };

    closeGroupWindow = () => {
        this.setState({addingToGroup: false});
    };

    openGroupWindow = () => {
        this.setState({addingToGroup: true});
    };
    
    render() {
        const actions = [
            {label: "Add To Group", handler: this.openGroupWindow},
            {label: "Upgrade Packages", group: "upgrade", disabled: !this.state.validVersions, handler: this.openSchedulerWindow}
        ];
        return (
            <div>
                <RecordHeader type="Org" icon={ORG_ICON} title={this.state.org.account_name} actions={actions}>
                    <HeaderField label="Org ID" value={this.state.org.org_id}/>
                    <HeaderField label="Instance" value={this.state.org.instance}/>
                    <HeaderField label="Type" value={this.state.org.is_sandbox ? "Sandbox" : "Production"}/>
                </RecordHeader>
                <OrgView org={this.state.org} versions={this.state.versions}/>
                {this.state.addingToGroup ?  <SelectGroupWindow org={this.state.org} versions={this.state.validVersions} onAdd={this.addToGroupHandler.bind(this)} onCancel={this.closeGroupWindow}/> : ""}
                {this.state.schedulingUpgrade ?  <ScheduleUpgradeWindow org={this.state.org} versions={this.state.validVersions} onUpgrade={this.upgradeHandler} onCancel={this.closeSchedulerWindow}/> : ""}
            </div>
        );
    }
}