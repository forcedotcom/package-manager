import React from 'react';
import {Router} from 'react-router';

import * as licenseService from '../services/LicenseService';

import {RecordHeader, HeaderField} from '../components/PageHeader';

export default React.createClass({

    getInitialState() {
        return { license: {} };
    },

    componentDidMount() {
        licenseService.findById(this.props.params.licenseId).then(license => this.setState({license}));
    },

    render() {
        return (
            <div>
                <RecordHeader type="License" icon="drafts" title={this.state.license.account_name}>
                    <HeaderField label="Name" value={this.state.license.name}/>
                    <HeaderField label="Package Version" value={this.state.license.package_version_name} />
                    <HeaderField label="Status" value={this.state.license.status}/>
                    <HeaderField label="Date Installed" value={this.state.license.install_date}/>
                </RecordHeader>
                {React.cloneElement(this.props.children, { license: this.state.license })}
            </div>
        );
    }
});