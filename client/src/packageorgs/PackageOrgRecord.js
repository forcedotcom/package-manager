import React from 'react';

import * as packageOrgService from '../services/PackageOrgService';

import {RecordHeader, HeaderField} from '../components/PageHeader';
import PackageOrgView from "./PackageOrgView";
import {PACKAGE_ORG_ICON} from "../Constants";

export default class extends React.Component {
    state = { packageorg: {} };

    componentDidMount() {
        let packageorgId = this.props.match.params.packageorgId;
        packageOrgService.requestById(packageorgId).then(packageorg => this.setState({packageorg}));
    }

    deleteHandler = () => {
        if (window.confirm(`Are you sure you want to remove this packaging org?`)) {
            packageOrgService.requestDelete([this.state.packageorg.org_id]).then(() => {
                window.location = '/packageorgs';
            });
        }
    };

    refreshHandler = () => {
        this.setState({packageorg: {name: '...', division: '...', org_id: '...', namespace: '...', instance_url: '...', instance_name:'...'}});
        packageOrgService.requestRefresh([this.state.packageorg.org_id]).then((packageorgs) => {
            this.setState({packageorg: packageorgs[0]});
        });
    };

    render() {
        let actions = [{label:"Refresh", handler:this.refreshHandler},{label:"Delete", handler:this.deleteHandler}];
        return (
            <div>
                <RecordHeader type="Package Org" icon={PACKAGE_ORG_ICON} title={this.state.packageorg.name} onDelete={this.deleteHandler} actions={actions}>
                    <HeaderField label="Division" value={this.state.packageorg.division}/>
                    <HeaderField label="Org ID" value={this.state.packageorg.org_id}/>
                    <HeaderField label="Namespace" value={this.state.packageorg.namespace}/>
                </RecordHeader>
                <PackageOrgView packageorg={this.state.packageorg}/>
            </div>
        );
    }
}