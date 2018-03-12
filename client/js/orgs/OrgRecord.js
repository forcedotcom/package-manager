import React from 'react';

import * as orgService from '../services/OrgService';
import * as licenseService from "../services/LicenseService";

import {HeaderField} from '../components/PageHeader';
import OrgRecordHeader from './OrgRecordHeader';

export default React.createClass({

    getInitialState() {
        return { org: {} };
    },

    handleUpgrade() {
        orgService.requestUpgrade(this.state.org.id, this.state.licenses.map(v => v.sfid));
    },

    componentDidMount() {
        orgService.requestById(this.props.params.orgId).then(org => this.setState({org}));
        licenseService.findByOrgId(this.props.params.orgId).then(licenses => this.setState({licenses}));
    },

    render() {
        return (
            <div>
                <OrgRecordHeader type="Org" icon="account" title={this.state.org.account_name} onUpgrade={this.handleUpgrade}>
                    <HeaderField label="Org ID" value={this.state.org.org_id}/>
                    <HeaderField label="Instance" value={this.state.org.instance}/>
                </OrgRecordHeader>
                {React.cloneElement(this.props.children, { org: this.state.org, licenses: this.state.licenses })}
            </div>
        );
    }
});