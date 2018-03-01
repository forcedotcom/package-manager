import React from 'react';

import * as orgGroupService from "../services/OrgGroupService";

export default React.createClass({

    getInitialState() {
        return {};
    },

    componentWillReceiveProps(props) {
        let orggroup = props.orggroup;
        this.loadGroupMembers(orggroup.id);
    },

    loadGroupMembers(orgGroupId) {
        orgGroupService.requestMembers(orgGroupId).then(members=> this.setState({members}));
    },

    render() {
        return (
            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top">
                <div className="slds-col--padded slds-size--1-of-1 slds-medium-size--1-of-2">
                    <div className="slds-grid slds-wrap slds-m-top--large">
                        <div className="slds-col--padded slds-size--1-of-1">
                            <br/>
                            {/*<OrgMemberCard members={this.state.members}/>*/}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});