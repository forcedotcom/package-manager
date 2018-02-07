import React from 'react';
import {Router} from 'react-router';

import * as packageService from '../services/PackageService';

import {RecordHeader, HeaderField} from '../components/PageHeader';

export default React.createClass({

    getInitialState() {
        return { pkg: {} };
    },

    componentDidMount() {
        packageService.findById(this.props.params.packageId).then(pkg => this.setState({pkg}));
    },

    render() {
        return (
            <div>
                <RecordHeader type="Package" icon="thanks" title={this.state.pkg.name}>
                    <HeaderField label="ID" value={this.state.pkg.sfid}/>
                    <HeaderField label="Packaging Org ID" value={this.state.pkg.org_id}/>
                    <HeaderField label="Package ID" value={this.state.pkg.package_id}/>
                </RecordHeader>
                {React.cloneElement(this.props.children, { pkg: this.state.pkg })}
            </div>
        );
    }
});