import React from 'react';
import {FormHeader} from "../components/PageHeader";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			isAdding: false,
			text: ""
		};
	
		this.onAdd = this.onAdd.bind(this);
		this.textChangeHandler = this.textChangeHandler.bind(this);
	}

	// Lifecycle
	render() {
		const actions = [
			{handler: this.onAdd, spinning: this.state.isAdding, label: "Add"},
			{handler: this.props.onCancel, label: "Cancel"}
		];

		return (
			<div>
				<div className="slds-modal slds-fade-in-open">
					<div className="slds-modal__container">
						<FormHeader type="Orgs" icon={icon} title={title} actions={actions}/>
						<div className="slds-modal__content slds-p-around_medium">
							<div className="slds-form slds-form_stacked slds-wrap  slds-m-around--medium">
								<div className="slds-form-element">
									<label className="slds-form-element__label" htmlFor="org_ids">Comment</label>
									<div className="slds-form-element__control">
                                        <textarea className="slds-textarea"
												  placeholder="Please add your comment here"
												  id="text" value={this.state.text} rows="3"
												  onChange={this.textChangeHandler} />
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="slds-modal-backdrop slds-modal-backdrop--open"/>
			</div>
		);
	}
	
	// Handlers
	onAdd() {
		this.setState({isAdding: true});
		this.props.onSave(this.state.text);
	}

	textChangeHandler(event) {
		this.setState({text: event.target.value});
	}

}
