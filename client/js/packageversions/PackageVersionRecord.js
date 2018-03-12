import React from 'react';

import * as packageVersionService from '../services/PackageVersionService';

import {RecordHeader, HeaderField} from '../components/PageHeader';

export default React.createClass({

    getInitialState() {
        return { packageVersion: {} };
    },

    componentDidMount() {
        packageVersionService.requestById(this.props.params.packageVersionId).then(pkg => this.setState({packageVersion}));
    },

    render() {
        return (
            <div>
                <RecordHeader type="Package Version" icon="thanks" title={this.state.packageVersion.name}>
                    <HeaderField label="ID" value={this.state.packageVersion.sfid}/>
                    <HeaderField label="Package" value={this.state.packageVersion.package_name}/>
                    <HeaderField label="Name" value={this.state.packageVersion.name}/>
                </RecordHeader>
                {React.cloneElement(this.props.children, { packageVersion: this.state.packageVersion })}
            </div>
        );
    }
});