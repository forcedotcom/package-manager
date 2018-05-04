import React from 'react';

import OrgCard from "../orgs/OrgCard";
import Tabs from "../components/Tabs";
import GroupMemberVersionCard from "../packageversions/GroupMemberVersionCard";

export default class extends React.Component {
    state = {};

    render() {
        return (
            <div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
                <Tabs id="OrgGroupView">
                    <div label="Members">
                        <OrgCard title="Members" orgs={this.props.members} onRemove={this.props.onRemoveMember}/>
                    </div>
                    <div label="Versions">
                        <GroupMemberVersionCard packageVersions={this.props.versions} onRemove={this.props.onRemoveMember} onSort={this.props.onSort}/>
                    </div>
                </Tabs>
            </div>
        );
    }
}