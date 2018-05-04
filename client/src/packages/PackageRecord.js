import React from 'react';

import * as packageService from '../services/PackageService';

import {RecordHeader, HeaderField} from '../components/PageHeader';
import PackageView from "./PackageView";
import {PACKAGE_ICON} from "../Constants";

export default class extends React.Component {
    state = { pkg: {} };

    componentDidMount() {
        packageService.requestById(this.props.match.params.packageId).then(pkg => this.setState({pkg}));
    }

    render() {
        return (
            <div>
                <RecordHeader type="Package" icon={PACKAGE_ICON} title={this.state.pkg.name}>
                    <HeaderField label="ID" value={this.state.pkg.sfid}/>
                    <HeaderField label="Packaging Org ID" value={this.state.pkg.package_org_id}/>
                    <HeaderField label="Package ID" value={this.state.pkg.package_id}/>
                </RecordHeader>
                <PackageView pkg={this.state.pkg}/>
            </div>
        );
    }
}