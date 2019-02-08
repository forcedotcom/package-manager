import React from 'react';
import {FormHeader} from "../components/PageHeader";
import {ORG_GROUP_ICON, GroupTypes} from "../Constants";
import PickList from "../components/PickList";

export default class extends React.Component {
	constructor(props) {
		super(props);
		let orggroup = props.orggroup || {id: "", name: "", description: "", type: props.type && props.type !== "All" ? props.type : "Upgrade Group"};
		this.state = {
			...orggroup, orgIds: [], orgs: ""
		};
		
		this.saveHandler = this.saveHandler.bind(this);
		this.nameChangeHandler = this.nameChangeHandler.bind(this);
		this.descChangeHandler = this.descChangeHandler.bind(this);
		this.typeChangeHandler = this.typeChangeHandler.bind(this);
		this.orgsChangeHandler = this.orgsChangeHandler.bind(this);
		this.orgsBlurHandler = this.orgsBlurHandler.bind(this);
	}

	// Lifecycle
	render() {
		let actions = [
			{handler: this.saveHandler, label: "Save", spinning: this.state.isSaving},
			{handler: this.props.onCancel, label: "Cancel"}
		];
		return (
			<div>
				<div className="slds-modal slds-fade-in-open">
					<div className="slds-modal__container">
						<FormHeader type={this.state.type} icon={ORG_GROUP_ICON} title={this.state.name} actions={actions}/>
						<div className="slds-modal__content slds-p-around_medium">

							<div className="slds-form slds-form_stacked slds-wrap  slds-m-around--medium">
								<div className="slds-form-element">
									<label className="slds-form-element__label" htmlFor="name">Name</label>
									<div className="slds-form-element__control">
										<input className="slds-input" type="text" id="name" value={this.state.name}
											   onChange={this.nameChangeHandler}/>
									</div>
								</div>
								<div className="slds-form-element">
									<label className="slds-form-element__label" htmlFor="type">Type</label>
									<div className="slds-form-element__control">
										<PickList value={this.state.type} onChange={this.typeChangeHandler} items={GroupTypes.map(t => t.name)}/>
									</div>
								</div>

								<div className="slds-form-element">
									<label className="slds-form-element__label"
										   htmlFor="description">Description</label>
									<div className="slds-form-element__control">
										<input className="slds-input" type="text" id="description"
											   value={this.state.description} onChange={this.descChangeHandler}/>
									</div>
								</div>
								<div className="slds-form-element">
									<label className="slds-form-element__label" htmlFor="org_ids">Import Org Ids</label>
									<div className="slds-form-element__control">
                                        <textarea className="slds-textarea"
												  placeholder="Comma, space or newline-delimited list of valid org ids"
												  id="org_id_import" value={this.state.orgs} rows="7"
												  onChange={this.orgsChangeHandler} onBlur={this.orgsBlurHandler}/>
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
		this.setState({isSaving: true});
		this.props.onSave(this.state);
	}

	nameChangeHandler(event) {
		this.setState({name: event.target.value});
	}

	descChangeHandler(event) {
		this.setState({description: event.target.value});
	}

	typeChangeHandler(value) {
		this.setState({type: value});
	}

	orgsChangeHandler(event) {
		this.setState({orgs: event.target.value});
	}

	orgsBlurHandler(event) {
		let vals = event.target.value.replace(/[ \t\r\n\f'"]/g, ",").split(",").map(v => v.substring(0, 18));
		let orgIdSet = new Set(vals.filter(elem => elem !== "" && (elem.length <= 18 && elem.startsWith("00D"))));
		let orgIds = Array.from(orgIdSet);
		this.setState({orgIds: orgIds, orgs: orgIds.join(", ")});
	}
}
