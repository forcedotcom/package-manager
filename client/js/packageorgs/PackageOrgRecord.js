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
        packageOrgService.findById(packageorgId).then(packageorg => this.setState({packageorg}));
    },

    saveHandler(packageorg) {
        packageOrgService.updateItem(packageorg);
    },

    editHandler() {
        window.location.hash= '#packageorg/' + this.state.packageorg.id + '/edit';
    },

    deleteHandler() {
        packageOrgService.deleteItem(this.state.packageorg.id).then(() => {
            window.location.hash = '#packageorgs';
        });
    },

    cloneHandler() {

    },

    render() {
        return (
            <div>
                <RecordHeader type="Package Org" icon="people" title={this.state.packageorg.name}
                              onEdit={this.editHandler}
                              onDelete={this.deleteHandler}>
                    <HeaderField label="Namespace" value={this.state.packageorg.namespace}/>
                    <HeaderField label="Status" value={this.state.packageorg.status}/>
                </RecordHeader>
                {React.cloneElement(this.props.children, { packageorg: this.state.packageorg, saveHandler: this.saveHandler})}
            </div>
        );
    }
});