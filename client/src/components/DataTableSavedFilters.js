import React from 'react';
import * as filtrage from '../services/filtrage';
import * as notifier from '../services/notifications';
import debounce from "lodash.debounce";
import * as authService from "../services/AuthService";

const LARGE_THRESHOLD = 7;
const MED_THRESHOLD = 5;
const SMALL_THRESHOLD = 3;
const MICRO_THRESHOLD = 2;

function calcThreshold(offset = 0) {
	return window.innerWidth > 1600 ? Math.max(0, LARGE_THRESHOLD - offset):
			window.innerWidth > 1200 ? Math.max(0, MED_THRESHOLD - offset) :
				window.innerWidth > 900 ? Math.max(0, SMALL_THRESHOLD - offset) :
				window.innerWidth > 600 ? Math.max(0, MICRO_THRESHOLD - offset) : 0;
}

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			user: authService.getSessionUser(this),
			filters: [],
			threshold: calcThreshold(props.offset),
			thresholdOffset: props.offset
		};
		
		filtrage.requestFilters(props.id).then(filters => {
			this.setState({current: props.filter, filters});
		});
		
		this.filterChangeHandler = this.filterChangeHandler.bind(this);
		this.createHandler = this.createHandler.bind(this);
		this.updateHandler = this.updateHandler.bind(this);
		this.resetHandler = this.resetHandler.bind(this);
		this.deleteHandler = this.deleteHandler.bind(this);
		this.clearHandler = this.clearHandler.bind(this);
		this.handleWindowResize = this.handleWindowResize.bind(this);
	}

	componentDidMount() {
		window.addEventListener('resize', this.handleWindowResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.handleWindowResize);
	}

	handleWindowResize = debounce(() => {
		let threshold = calcThreshold(this.state.thresholdOffset);
		if (this.state.threshold !== threshold) {
			this.setState({threshold})
		}
	}, 100);

	// Lifecycle
	componentWillReceiveProps(props) {
		const {filters, threshold} = this.state;
		let isModified = false;
		let selectedId = filtrage.getSelectedFilterId(props.id);
		const selectedIndex = filters.findIndex(f => f.id === selectedId);
		const selected = filters[selectedIndex];
		if (selectedIndex >= threshold) {
			filters.splice(selectedIndex, 1);
			filters.splice(threshold - 1, 0, selected);
		}
		if (selected && props.filterColumns && filtrage.hasChangedFrom(selected.query, props.filterColumns)) {
			// Filter changed, so signal that it no longer matches the selected saved filter.
			isModified = true;
		}

		this.setState({isModified});
	}
	
	render() {
		let selectedId = filtrage.getSelectedFilterId(this.props.id);

		const {isModified, threshold, filters, showMenu, user} = this.state;
		if (!this.props.filterColumns && filters.length === 0)
			return "";

		const options = filters.slice(0, threshold).map(f =>
			<span key={f.id} className="slds-button slds-radio_button">
				<input checked={f.id === selectedId} type="radio" name={this.props.id} id={f.id} value={f.id}
					   onChange={this.filterChangeHandler}/>
				<label style={f.id === selectedId && isModified ? {backgroundColor: "#016601"} : {}}
					   title={f.id === selectedId && isModified ? "You modified your filter.  Click Save Changes to keep them" : ""} 
					   className="slds-radio_button__label" htmlFor={f.id}>
					<span className="slds-radio_faux">{f.name}</span>
				</label>
			</span>);

		const overflow = filters.length > threshold ? filters.slice(threshold).map(f =>
			<li key={f.id} id={f.id} className="slds-dropdown__item">
				<a onClick={this.filterChangeHandler}>
					<span className="slds-truncate">
						<svg className="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small">
							<use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#filter"/>
						</svg>{f.name}
					</span>
				</a>
			</li>
		
		) : [];
		if (overflow.length > 0)
			overflow.push(<li key="overflowDivider" className="slds-has-divider_top-space slds-dropdown__item"/>);
		const hasFilter = this.props.filterColumns && this.props.filterColumns.length > 0;
		const hasMenuItems = !user.read_only || overflow.length > 0;
		const menu = hasMenuItems || hasFilter ?
			<div className={`slds-dropdown-trigger slds-dropdown-trigger_click slds-m-right--medium ${showMenu ? "slds-is-open" : ""}`}
				 onMouseLeave={() => this.setState({showMenu: null})} onClick={() => this.setState({showMenu: null})}>
				<div style={{display: "inline-flex"}}>
					{hasMenuItems ? <button className="slds-button slds-radio_button slds-button_icon slds-button_icon-container-more"
						onMouseEnter={e => this.setState({showMenu: window.innerWidth - e.clientX > 200 ? "left" : "right"})}>
						<svg className="slds-button__icon">
							<use xmlnsXlink="http://www.w3.org/1999/xlink"
								 xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#filter"/>
						</svg>
						<svg className="slds-button__icon slds-button__icon_x-small">
							<use xmlnsXlink="http://www.w3.org/1999/xlink"
								 xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#down"/>
						</svg>
					</button> : <div className="slds-m-around--xx-small"/> }
					{hasFilter ?
					<button className="slds-button" onClick={this.clearHandler} title="Clear filters and show everything">
						<svg className="slds-button__icon">
							<use xmlnsXlink="http://www.w3.org/1999/xlink"
								 xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#clear"/>
						</svg>
					</button> : "" }
				</div>
				<div className={`slds-m-around_none slds-dropdown slds-dropdown_${showMenu} slds-dropdown_small`}>
					<ul className="slds-dropdown__list">
						{overflow}
						{!user.read_only ?
						<li className="slds-dropdown__item">
							<a tabIndex="0" onClick={this.createHandler}>
								<span className="slds-truncate">
									<svg className="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small">
									  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#new"/>
									</svg>Save as new filter
								</span>
							</a>
						</li> : '' }
						{!user.read_only && selectedId != null ? [
						<li key="updateHandler" className="slds-has-divider_top-space slds-dropdown__item">
							<a tabIndex="0" onClick={this.updateHandler}>
								<span className="slds-truncate">
									<svg className="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small">
									  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#save"/>
									</svg>Save changes to filter
								</span>
							</a>
						</li>,
						<li key="resetHandler" className="slds-dropdown__item">
							<a tabIndex="0" onClick={this.resetHandler}>
								<span className="slds-truncate">
									<svg className="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small">
									  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#undo"/>
									</svg>Undo changes to filter
								</span>
							</a>
						</li>,
						<li key="deleteHandler" className="slds-dropdown__item">
							<a tabIndex="2" onClick={this.deleteHandler}>
								<span className="slds-truncate">
									<svg className="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small">
									  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#delete"/>
									</svg>Delete selected filter
								</span>
							</a>
						</li>] : "" }
						{hasFilter ?
						<li className={`${hasMenuItems ? "slds-has-divider_top-space" : ""} slds-dropdown__item`}>
							<a tabIndex="3" onClick={this.clearHandler}>
							<span className="slds-truncate">
								<svg className="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small">
								  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#clear"/>
								</svg>Clear filters and show everything
							</span>
							</a>
						</li> : "" }
					</ul>
				</div>
			</div> : "";

		return (
			<div style={{display: "inherit"}}>
				<span className="slds-text-title_caps slds-m-right--x-small slds-align_absolute-center">Filters</span>
				<div className="slds-radio_button-group">
					{options}
				</div>
				{menu}
			</div>
		);
	}

	// Handlers
	filterChangeHandler(e) {
		const {filters} = this.state;
		const id = this.findId(e.target);
		const selected = filters.find(f => f.id === parseInt(id, 10));
		const selectedId = selected ? selected.id : null;
		filtrage.setSelectedFilterId(this.props.id, selectedId);
		this.props.onSelect(selected ? selected.query : null);
	}

	createHandler() {
		const name = prompt("Choose a name for your filter");
		if (name) {
			filtrage.requestSaveFilter(this.props.id, name)
			.then(filter => {
				filtrage.requestFilters(this.props.id)
				.then(filters => {
					filtrage.setSelectedFilterId(this.props.id, filter.id);
					this.setState({filters, isModified: false});
				})
			}).catch(err => notifier.error(err.message));
		}
	}

	updateHandler() {
		const {filters, threshold} = this.state;
		let selectedId = filtrage.getSelectedFilterId(this.props.id);
		const selected = filters.find(f => f.id === parseInt(selectedId, 10));
		const name = prompt("Save changes to your filter", selected.name);
		if (name) {
			filtrage.requestSaveFilter(this.props.id, name, selected.id)
			.then(() => {
				filtrage.requestFilters(this.props.id)
				.then(filters => {
					const selectedIndex = filters.findIndex(f => f.id === selectedId);
					if (selectedIndex >= threshold) {
						const selected = filters[selectedIndex];
						filters.splice(selectedIndex, 1);
						filters.splice(threshold - 1, 0, selected);
					}
					this.setState({filters, isModified: false})
				})
			}).catch(err => notifier.error(err.message));
		}
	}

	resetHandler() {
		const {filters} = this.state;
		let selectedId = filtrage.getSelectedFilterId(this.props.id);
		const selected = filters.find(f => f.id === parseInt(selectedId, 10));
		this.props.onSelect(selected ? selected.query : null);
	}

	deleteHandler() {
		let selectedId = filtrage.getSelectedFilterId(this.props.id);

		const {filters} = this.state;
		const selected = filters.find(f => f.id === parseInt(selectedId, 10));
		if (window.confirm(`Are you sure you want to delete ${selected.name}?`)) {
			filtrage.requestDeleteFilter(this.props.id, selected.id)
			.then(() => {
				filtrage.requestFilters(this.props.id)
				.then(filters => this.setState({filters, isModified: false}))
			}).catch(err => notifier.error(err.message));
		}
	}

	clearHandler() {
		filtrage.setSelectedFilterId(this.props.id, null);
		this.props.onSelect([]);
	}

	
	// Utilities
	findId(elem) {
		if (elem.id != null && elem.id !== "")
			return elem.id;
		return this.findId(elem.parentElement);
	}
}
