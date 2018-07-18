import React from 'react';
import DatePicker from "react-datepicker";
import moment from 'moment';

import 'react-datepicker/dist/react-datepicker.css';
import '../components/datepicker.css';
import * as packageVersionService from "../services/PackageVersionService";

export default class extends React.Component {
	state = {
		startDate: moment().add(15, 'minutes'),
		description: this.props.description || ""
	};

	componentDidMount() {
		const packageIds = new Set();
		this.props.versions.forEach(v => packageIds.add(v.package_id));
		packageVersionService.requestAllValid(Array.from(packageIds)).then(validVersions => {
			const packageMap = new Map();
			validVersions.forEach(v => {
				let p = packageMap.get(v.package_id);
				if (!p) {
					p = {id: v.package_id, name: v.package_name, selectedVersion: null, versions: []};
					packageMap.set(p.id, p);
				}
				if (p.selectedVersion == null && v.status === "Verified") {
					p.selectedVersion = v.version_id;
				}
				p.versions.push(v);
			});
			this.setState({packageMap});
		});
	}

	handleVersionChange = (packageId, selectedVersion) => {
		let p = this.state.packageMap.get(packageId);
		p.selectedVersion = selectedVersion;
		this.setState({packageMap: this.state.packageMap});
	};

	handleDateChange = (startDate) => {
		this.setState({startDate});
	};

	handleDescriptionChange = (event) => {
		this.setState({description: event.target.value});
	};

	upgradeHandler = () => {
		let valid = true;
		if (this.state.description === null || this.state.description === "") {
			this.setState({missingDescription: true});
			valid = false;
		} else {
			this.setState({missingDescription: false});
		}

		if (!valid)
			return;

		const versions = Array.from(this.state.packageMap.values()).map(p => p.selectedVersion).filter(versionId => !versionId.startsWith("[[NONE]]"));
		
		this.setState({isScheduling: true});
		this.props.onUpgrade(versions, this.state.startDate, this.state.description);
	};

	render() {
		const versionFields = this.state.packageMap ? this.props.versions.map(v =>
			<VersionField key={v.package_id} package={this.state.packageMap.get(v.package_id)} onSelect={this.handleVersionChange}/> 
		) : [];
		
		return (
			<div>
				<div className="slds-modal slds-fade-in-open">
					<div className="slds-modal__container">
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
							<div className="slds-form slds-form_stacked slds-wrap  slds-m-around--medium">
								<div className="slds-form-element">
									<label className="slds-text-heading_small slds-m-bottom--x-small">Details</label>
								</div>
								<div className="slds-form-element">
									<label className="slds-form-element__label" htmlFor="text-input-id-1">Start
										Date</label>
									<DatePicker className="slds-input"
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
								</div>
								{versionFields}
							</div>
						</div>

						<div className="slds-modal__footer">
							<button className="slds-button slds-button--neutral" onClick={this.props.onCancel}>Cancel
							</button>
							<button className="slds-button slds-button--neutral slds-button--brand"
									onClick={this.upgradeHandler.bind(this)}>
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
}

class VersionField extends React.Component {
	versionChangeHandler = (e) => {
		this.props.onSelect(this.props.package.id, e.target.value);
	};

	render() {
		const p = this.props.package;
		const availableVersions = p.versions.concat([{version_number: "NONE", version_id: "[[NONE]]" + p.id}]);
		let options = availableVersions.map(v => 
			<span key={v.version_id} className="slds-button slds-radio_button">
				<input checked={v.version_id === this.props.package.selectedVersion} type="radio" name={p.id} id={v.version_id} value={v.version_id}
					onChange={this.versionChangeHandler}/>
				<label className="slds-radio_button__label" htmlFor={v.version_id}>
					<span className="slds-radio_faux">{v.version_number}</span>
				</label>
			</span>);
		
		return (
			<div className="slds-form-element">
				<fieldset className="slds-form-element">
					<legend className="slds-form-element__legend slds-form-element__label">{p.name}</legend>
					<div className="slds-form-element__control">
						<div className="slds-radio_button-group">{options}</div>
					</div>
				</fieldset>
			</div>
		);
	}
}
