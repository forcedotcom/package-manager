import React from 'react';
import {Router} from 'react-router';

import * as orgGroupService from '../services/OrgGroupService';

import {RecordHeader, HeaderField} from '../components/PageHeader';

export default React.createClass({

    getInitialState() {
        return { orggroup: {} };
    },

    componentDidMount() {
        orgGroupService.requestById(this.props.params.orgGroupId).then(orggroup => this.setState({orggroup}));
    },

    saveHandler(orggroup) {
        orgGroupService.requestUpdate(orggroup).then(() => {
            window.location.hash = '#orggroups';
        });
    },

    editHandler() {
        window.location.hash= '#orggroup/' + this.state.orggroup.id + '/edit';
    },

    deleteHandler() {
        orgGroupService.requestDelete(this.state.orggroup.id).then(() => {
            window.location.hash = '#orggroups';
        });
    },

    render() {
        return (
            <div>
                <RecordHeader type="Org Group" icon="groups" title={this.state.orggroup.name} onEdit={this.editHandler} onDelete={this.deleteHandler}>
                    <HeaderField label="" value={this.state.orggroup.description}/>
                </RecordHeader>
                {React.cloneElement(this.props.children, { orggroup: this.state.orggroup, saveHandler: this.saveHandler})}
            </div>
        );
    }
});