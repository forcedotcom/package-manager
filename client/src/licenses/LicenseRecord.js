import React from 'react';

import * as licenseService from '../services/LicenseService';

import {RecordHeader, HeaderField} from '../components/PageHeader';
import LicenseView from "./LicenseView";
import {LICENSE_ICON} from "../Constants";

export default class extends React.Component {
    state = { license: {} };

    componentDidMount() {
        licenseService.requestById(this.props.match.params.licenseId).then(license => this.setState({license}));
    }

    render() {
        return (
            <div>
                <RecordHeader type="License" icon={LICENSE_ICON} title={this.state.license.account_name}>
                    <HeaderField label="Name" value={this.state.license.name}/>
                    <HeaderField label="Version Name" value={this.state.license.version_name} />
                    <HeaderField label="Version Number" value={this.state.license.version_number} />
                    <HeaderField label="Status" value={this.state.license.status}/>
                    <HeaderField label="Date Installed" format="date" value={this.state.license.install_date}/>
                </RecordHeader>
                <LicenseView license={this.state.license}/>
            </div>
        );
    }
}