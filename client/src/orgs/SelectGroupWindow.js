import React from 'react';
import Lookup from "../components/Lookup";
import * as orgGroupService from "../services/OrgGroupService";
import {ORG_GROUP_ICON} from "../Constants";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			items: [],
			title: props.title || 'Select Group'	
		};
		
		this.searchKeyChangeHandler = this.searchKeyChangeHandler.bind(this);
		this.groupChangeHandler = this.groupChangeHandler.bind(this);
	}

	// Lifecycle
	componentDidMount() {
		orgGroupService.requestByTextSearch("", this.props.excludeId).then(items => this.setState({items: items}));
	}

	render() {
		return (
			<div>
				<div className="slds-modal slds-fade-in-open">
					<div className="slds-modal__container">
						<div className="slds-modal__header">
							<button className="slds-button slds-modal__close">
								<svg aria-hidden="true"
									 className="slds-button__icon slds-button__icon--inverse slds-button__icon--large">
								</svg>
								<span className="slds-assistive-text">Close</span>
							</button>
							<h2 className="slds-text-heading--medium">{this.state.title}</h2>
						</div>
						<div style={{height: 450}} className="slds-modal__content slds-p-around_medium">
							<Lookup placeholder="Select a group, or name a new one"
									items={this.state.items}
									valueField="id"
									labelField="name"
									icon={ORG_GROUP_ICON}
									descriptionField="description"
									onSearchKeyChange={this.searchKeyChangeHandler}
									onChange={this.groupChangeHandler}/>
						</div>

						<div className="slds-modal__footer">
							<button className="slds-button slds-button--neutral" onClick={this.props.onCancel}>Cancel
							</button>
						</div>
					</div>
				</div>
				<div className="slds-modal-backdrop slds-modal-backdrop--open"></div>
			</div>
		);
	}
	
	// Handlers
	searchKeyChangeHandler(key) {
		let text = key.target.value || "";
		orgGroupService.requestByTextSearch(text, this.props.excludeId).then(items => {
			if (items.length === 0 && text !== "") {
				items.push({name: text, description: `Create a new group named "${text}"`, id: -1})
			}
			this.setState({items: items});
		});
	}

	groupChangeHandler(groupId, groupName) {
		this.props.onAdd(groupId, groupName, this.props.removeAfterAdd);
	}
}