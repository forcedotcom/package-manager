import React from 'react';
import DatePicker from "react-datepicker";
import moment from 'moment';

import {PackageVersionStatus} from "../Constants";
import 'react-datepicker/dist/react-datepicker.css';
import '../components/datepicker.css';
import * as packageVersionService from "../services/PackageVersionService";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			startDate: moment().add(15, 'minutes'),
			description: this.props.description || ""
		};
		
		this.handleSelectNone = this.handleSelectNone.bind(this);
		this.handleVersionChange = this.handleVersionChange.bind(this);
		this.handleDateChange = this.handleDateChange.bind(this);
		this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
		this.upgradeHandler = this.upgradeHandler.bind(this);
	}
	
	// Lifecycle
	componentDidMount() {
		packageVersionService.requestAllValid(this.props.packageIds).then(validVersions => {
			const packageMap = new Map();
			validVersions.forEach(v => {
				let p = packageMap.get(v.package_id);
				if (!p) {
					p = {id: v.package_id, name: v.package_name, selectedVersions: [], versions: []};
					packageMap.set(p.id, p);
				}
				if (p.selectedVersions.length === 0 && v.status === PackageVersionStatus.Verified) {
					p.selectedVersions.push(v.version_id);
				}
				p.versions.push(v);
			});
			this.setState({packageMap});
		});
	}
	
	render() {
		const versionFields = this.state.packageMap ? this.props.packageIds.map(packageId =>
			this.state.packageMap.has(packageId) ?
				<VersionField key={packageId} package={this.state.packageMap.get(packageId)} onSelect={this.handleVersionChange}/> : ""
		) : [];
		
		return (
			<div>
				<style dangerouslySetInnerHTML={{__html: `
				  .date_picker_wide { width: 16em}
				`}} />
				<div className="slds-modal slds-fade-in-open">
					<div className="slds-modal__container" style={{maxWidth: "60em", width: "60%"}}>
						<div className="slds-modal__header">
							<h2 className="slds-text-heading--medium">Schedule Upgrade</h2>
							<button className="slds-button slds-modal__close">
								<svg aria-hidden="true"
									 className="slds-button__icon slds-button__icon--inverse slds-button__icon--large">
								</svg>
								<span className="slds-assistive-text">Close</span>
							</button>
						</div>
						<div className="slds-modal__content slds-p-around_medium">
							<div className="slds-form slds-form_stacked slds-wrap slds-m-around--medium">
								<div className="slds-form-element">
									<label className="slds-text-heading_small slds-m-bottom--x-small">Details</label>
								</div>
								<div className="slds-form-element">
									<label className="slds-form-element__label" htmlFor="text-input-id-1">Start
										Date</label>
									<DatePicker className="date_picker_wide slds-input slds-m-right--xx-small"
												selected={this.state.startDate}
												onChange={this.handleDateChange}
												showTimeSelect
												timeFormat="HH:mm"
												timeIntervals={5}
												dateFormat="LLL"
												timeCaption="time"/>
								</div>
								<div
									className={`slds-form-element ${this.state.missingDescription ? "slds-has-error" : ""}`}>
									<label className="slds-form-element__label" htmlFor="name"><abbr
										className="slds-required" title="required">*</abbr>Description</label>
									<div className="slds-form-element__control">
										<textarea className="slds-input" rows={2} id="description"
												  value={this.state.description}
												  onChange={this.handleDescriptionChange}/>
									</div>
									{this.state.missingDescription ?
										<span className="slds-form-element__help" id="form-error-01">Description is required</span> : ""}
								</div>
								<div className="slds-form-element">
									<label className="slds-text-heading_small">Package Upgrade Versions</label>
									{versionFields.length > 1 ? 
										<button style={{marginBottom: ".18em", height: "2em", lineHeight: "1rem", borderRadius: "10px"}} 
											className="slds-button slds-text-title_caps slds-button--neutral 
											slds-p-left--x-small slds-p-right--x-small slds-m-left--small" id={this.props.id}
											   onClick={this.handleSelectNone}><svg style={{marginBottom: ".18em"}} className="slds-button__icon_stateful slds-button__icon_left">
											<use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#close"/>
										</svg>Select None</button> : "" }
								</div>
								<div className="slds-form-element__label slds-m-bottom--small">Select which version to upgrade for each package.  <b>Command-click</b> to select multiple versions.</div>
								{versionFields}
							</div>
						</div>

						<div className="slds-modal__footer">
							<button className="slds-button slds-button--neutral" onClick={this.props.onCancel}>Cancel
							</button>
							<button className="slds-button slds-button--neutral slds-button--brand"
									onClick={this.upgradeHandler}>
								{this.state.isScheduling ?
									<div style={{width: "3em"}}>&nbsp;
										<div role="status" className="slds-spinner slds-spinner_x-small">
											<div className="slds-spinner__dot-a"/>
											<div className="slds-spinner__dot-b"/>
										</div>
									</div> : "Schedule"}
							</button>
						</div>
					</div>
				</div>
				<div className="slds-modal-backdrop slds-modal-backdrop--open"/>
			</div>
		);
	}
	
	// Handlers
	handleSelectNone() {
		const {packageMap} = this.state;
		packageMap.forEach(p => p.selectedVersions = ["[[NONE]]"]);
		this.setState({packageMap});
	}
	
	handleVersionChange(packageId, selectedVersion, multiselect) {
		const {packageMap} = this.state;
		let p = packageMap.get(packageId);
		const index = p.selectedVersions.indexOf(selectedVersion);
		if (!multiselect || selectedVersion === "[[NONE]]") {
			p.selectedVersions = [selectedVersion];
		} else {
			const noneIndex = p.selectedVersions.indexOf("[[NONE]]");
			if (noneIndex !== -1)
				p.selectedVersions.splice(noneIndex, 1);
			
			if (index === -1) {
				p.selectedVersions.push(selectedVersion);
			} else {
				p.selectedVersions.splice(index, 1);
			}
		}
		
		this.setState({packageMap});
	}

	handleDateChange(startDate) {
		this.setState({startDate});
	}

	handleDescriptionChange(event) {
		this.setState({description: event.target.value});
	}

	upgradeHandler() {
		let valid = true;
		if (this.state.description === null || this.state.description === "") {
			this.setState({missingDescription: true});
			valid = false;
		} else {
			this.setState({missingDescription: false});
		}

		if (!valid)
			return;

		this.setState({isScheduling: true});
		let versions = [];
		this.state.packageMap.forEach(p => versions = versions.concat(p.selectedVersions));
		this.props.onUpgrade(versions.filter(versionId => !versionId.startsWith("[[NONE]]")), this.state.startDate, this.state.description);
	}
}

class VersionField extends React.Component {
	versionChangeHandler = (e) => {
		this.props.onSelect(this.props.package.id, this.findId(e.target), e.metaKey || e.shiftKey || e.ctrlKey);
	};

	render() {
		const p = this.props.package;
		const availableVersions = p.versions.concat([{version_number: "NONE", version_id: "[[NONE]]"}]);
		let options = availableVersions.map(v => 
			<VersionButton key={v.version_id} toggled={this.props.package.selectedVersions.indexOf(v.version_id) !== -1} 
						   id={v.version_id} label={v.version_number}
					handler={this.versionChangeHandler}/>);
		return (
			<div className="slds-form-element">
				<fieldset className="slds-form-element">
					<legend className="slds-form-element__legend slds-form-element__label">{p.name}</legend>
					<div className="slds-form-element__control">
						<div className="slds-button-group" role="group">{options}</div>
					</div>
				</fieldset>
			</div>
		);
	}

	// Utilities
	findId(elem) {
		if (elem.id != null && elem.id !== "")
			return elem.id;
		return this.findId(elem.parentElement);
	}
}


export class VersionButton extends React.Component {
	UNSELECTED_ICON = <svg style={{marginBottom: ".18em"}} className="slds-button__icon_stateful slds-button__icon_left">
		<use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#add"/></svg>;
	SELECTED_ICON = <svg style={{marginBottom: ".18em"}} className="slds-button__icon_stateful slds-button__icon_left">
		<use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#check"/></svg>;
	NONE_ICON = <svg style={{marginBottom: ".18em"}} className="slds-button__icon_stateful slds-button__icon_left">
		<use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#close"/></svg>;

	render() {
		return (
			<button id={this.props.id} className={`slds-button slds-button_stateful ${this.props.toggled ? "slds-button_brand slds-is-selected-clicked" : "slds-button_neutral slds-not-selected"}`}
					onClick={this.props.handler} title="Command-click to select multiple versions">
  				<span className="slds-text-not-selected">
					{this.props.id === "[[NONE]]" ? this.NONE_ICON : this.UNSELECTED_ICON}
					{this.props.label}</span>
				<span className="slds-text-selected">
					{this.SELECTED_ICON}
					{this.props.label}</span>
			</button>
		);
	}
}