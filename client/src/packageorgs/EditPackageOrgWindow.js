import React from 'react';
import {FormHeader, HeaderField} from "../components/PageHeader";
import {PACKAGE_ORG_ICON} from "../Constants";
import PickList from "../components/PickList";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			org_id: props.packageorg.org_id,
			type: props.packageorg.type || "",
			description: props.packageorg.description || ""
		};
		
		this.saveHandler = this.saveHandler.bind(this);
		this.typeChangeHandler = this.typeChangeHandler.bind(this);
		this.descChangeHandler = this.descChangeHandler.bind(this);
	}

	// Lifecycle
	render() {
		return (
			<div>
				<div className="slds-modal slds-fade-in-open">
					<div className="slds-modal__container">
						<FormHeader type="Org Connection" icon={PACKAGE_ORG_ICON} title={this.props.packageorg.name}
									onSave={this.saveHandler} onCancel={this.props.onCancel}>
							<HeaderField label="Instance URL" value={this.props.packageorg.instance_url}/>
							<HeaderField label="Status" value={this.props.packageorg.status}/>
						</FormHeader>
						<div className="slds-modal__content slds-p-around_medium">

							<div className="slds-form slds-form_stacked slds-wrap  slds-m-around--medium">
								<div className="slds-form-element">
									<label className="slds-form-element__label" htmlFor="type">Type</label>
									<div className="slds-form-element__control">
										<PickList value={this.state.type} onChange={this.typeChangeHandler}
												  items={["Package", "Licenses", "Accounts"]}/>
									</div>
								</div>
								<div className="slds-form-element">
									<label className="slds-form-element__label"
										   htmlFor="description">Description</label>
									<div className="slds-form-element__control">
										<textarea rows="4" className="slds-input" id="description"
												  value={this.state.description} onChange={this.descChangeHandler}/>
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
	saveHandler() {
		this.props.onSave(this.state);
	}

	typeChangeHandler(value) {
		this.setState({type: value});
	}

	descChangeHandler(event) {
		this.setState({description: event.target.value});
	}
}
