import React from 'react';
import {Router} from 'react-router';

import * as packageOrgService from '../services/PackageOrgService';

import {RecordHeader, HeaderField} from '../components/PageHeader';

export default React.createClass({

    getInitialState() {
        return { packageorg: {} };
    },

    componentDidMount() {
        let packageorgId = this.props.params.packageorgId;
        packageOrgService.requestById(packageorgId).then(packageorg => this.setState({packageorg}));
    },

    deleteHandler() {
        packageOrgService.requestDeleteById(this.state.packageorg.id).then(() => {
            window.location.hash = '#packageorgs';
        });
    },

    render() {
        return (
            <div>
                <RecordHeader type="Package Org" icon="people" title={this.state.packageorg.name} onDelete={this.deleteHandler}>
                    <HeaderField label="Org ID" value={this.state.packageorg.org_id}/>
                    <HeaderField label="Namespace" value={this.state.packageorg.namespace}/>
                </RecordHeader>
                {React.cloneElement(this.props.children, { packageorg: this.state.packageorg})}
            </div>
        );
    }
});