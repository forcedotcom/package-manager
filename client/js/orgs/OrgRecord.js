import React from 'react';
import {Router} from 'react-router';

import * as orgService from '../services/OrgService';

import {RecordHeader, HeaderField} from '../components/PageHeader';

export default React.createClass({

    getInitialState() {
        return { org: {} };
    },

    componentDidMount() {
        orgService.findById(this.props.params.orgId).then(org => this.setState({org}));
    },

    render() {
        return (
            <div>
                <RecordHeader type="Org" icon="account" title={this.state.org.account_name}>
                    <HeaderField label="Org ID" value={this.state.org.id}/>
                    <HeaderField label="Instance" value={this.state.org.instance}/>
                </RecordHeader>
                {React.cloneElement(this.props.children, { org: this.state.org })}
            </div>
        );
    }
});