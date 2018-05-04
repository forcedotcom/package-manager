import React from 'react';

import * as packageVersionService from '../services/PackageVersionService';

import {RecordHeader, HeaderField} from '../components/PageHeader';
import PackageVersionView from "./PackageVersionView";
import {PACKAGE_VERSION_ICON} from "../Constants";

export default class extends React.Component {
    state = { packageVersion: {} };

    componentDidMount() {
        packageVersionService.requestById(this.props.match.params.packageVersionId).then(packageVersion => this.setState({packageVersion}));
    }

    render() {
        return (
            <div>
                <RecordHeader type="Package Version" icon={PACKAGE_VERSION_ICON} title={this.state.packageVersion.name}>
                    <HeaderField label="Package" value={this.state.packageVersion.package_name}/>
                    <HeaderField label="Number" value={this.state.packageVersion.version_number}/>
                    <HeaderField label="Name" value={this.state.packageVersion.name}/>
                    <HeaderField label="ID" value={this.state.packageVersion.sfid}/>
                    <HeaderField label="Status" value={this.state.packageVersion.status}/>
                </RecordHeader>
                <PackageVersionView packageVersion={this.state.packageVersion}/>
            </div>
        );
    }
}