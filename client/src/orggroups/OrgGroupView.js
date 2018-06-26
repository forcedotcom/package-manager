import React from 'react';

import Tabs from "../components/Tabs";
import GroupMemberVersionCard from "../packageversions/GroupMemberVersionCard";
import GroupMemberOrgCard from "../orgs/GroupMemberOrgCard";

export default class extends React.Component {
	state = {};

	render() {
		return (
			<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
				<Tabs id="OrgGroupView">
					<div label="Members">
						<GroupMemberOrgCard orggroup={this.props.orggroup} orgs={this.props.members}
											onSelect={this.props.onSelect} actions={this.props.memberActions}
											selected={this.props.selected}/>
					</div>
					<div label="Versions">
						<GroupMemberVersionCard orggroup={this.props.orggroup} packageVersions={this.props.versions}
												onSelect={this.props.onSelect} actions={this.props.memberActions}
												selected={this.props.selected}/>
					</div>
				</Tabs>
			</div>
		);
	}
}