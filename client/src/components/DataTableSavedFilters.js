import React from 'react';
import * as filtrage from '../services/filtrage';
import * as notifier from '../services/notifications';

const OVERFLOW_LIMIT = 5;
export default class extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			filters: []
		};
		
		filtrage.requestFilters(props.id).then(filters => {
			this.setState({current: props.filter, filters});
		});
	}

	componentWillReceiveProps(props) {
		const {filters} = this.state;
		let isModified = false;
		let selectedId = filtrage.getSelectedFilterId(props.id);
		let foundIndex = -1;
		const selected = filters.find((f,index) => {
			const found = f.id === selectedId;
			if (found) {
				foundIndex = index;
			}
			return found;
		});
		if (foundIndex >= OVERFLOW_LIMIT) {
			filters.splice(foundIndex, 1);
			filters.splice(OVERFLOW_LIMIT-1, 0, selected);
		}
		if (selected && props.filterColumns && filtrage.hasChangedFrom(selected.query, props.filterColumns)) {
			// Filter changed, so signal that it no longer matches the selected saved filter.
			isModified = true;
		}
		
		this.setState({selectedId, isModified});
	}
	
	filterChangeHandler = (e) => {
		const {filters} = this.state;
		const id = this.findId(e.target);
		const selected = filters.find(f => f.id === parseInt(id, 10));
		const selectedId = selected ? selected.id : null;
		filtrage.setSelectedFilterId(this.props.id, selectedId);
		this.props.onSelect(selected ? selected.query : null);
	};

	findId = (elem) => {
		if (elem.id != null && elem.id !== "")
			return elem.id;
		return this.findId(elem.parentElement);
	};
	
	createHandler = () => {
		const name = prompt("Choose a name for your filter");
		if (name) {
			filtrage.requestSaveFilter(this.props.id, name)
				.then(filter => {
					filtrage.requestFilters(this.props.id)
						.then(filters => this.setState({filters, selectedId: filter.id, isModified: false}))
				}).catch(err => notifier.error(err.message));
		}
	};
	
	updateHandler = () => {
		const {filters, selectedId} = this.state;
		const selected = filters.find(f => f.id === parseInt(selectedId, 10));
		const name = prompt("Save changes to your filter", selected.name);
		if (name) {
			filtrage.requestSaveFilter(this.props.id, name, selected.id)
				.then(filter => {
					filtrage.requestFilters(this.props.id)
						.then(filters => this.setState({filters, selectedId: filter.id, isModified: false}))
				}).catch(err => notifier.error(err.message));
		}
	};
	
	deleteHandler = () => {
		const {filters, selectedId} = this.state;
		const selected = filters.find(f => f.id === parseInt(selectedId, 10));
		if (window.confirm(`Are you sure you want to delete ${selected.name}?`)) {
			filtrage.requestDeleteFilter(this.props.id, selected.id)
			.then(() => {
				filtrage.requestFilters(this.props.id)
					.then(filters => this.setState({filters, selectedId: null, isModified: false}))
			}).catch(err => notifier.error(err.message));
		}
	};
	
	clearHandler = () => {
		filtrage.setSelectedFilterId(this.props.id, null);
		this.props.onSelect([]);
	};

	render() {
		const {selectedId, isModified, filters, showMenu} = this.state;
		if (!this.props.filterColumns && filters.length === 0)
			return "";

		const options = filters.slice(0, OVERFLOW_LIMIT).map(f =>
			<span key={f.id} className="slds-button slds-radio_button">
				<input checked={f.id === selectedId} type="radio" name={this.props.id} id={f.id} value={f.id}
					   onChange={this.filterChangeHandler}/>
				<label style={f.id === selectedId && isModified ? {backgroundColor: "#016601"} : {}}
					   title={f.id === selectedId && isModified ? "You modified your filter.  Click Save Changes to keep them" : ""} 
					   className="slds-radio_button__label" htmlFor={f.id}>
					<span className="slds-radio_faux">{f.name}</span>
				</label>
			</span>);

		const overflow = filters.length > OVERFLOW_LIMIT ? filters.slice(OVERFLOW_LIMIT).map(f =>
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
			overflow.push(<li className="slds-has-divider_top-space slds-dropdown__item"/>);

		const menu =
			<div className={`slds-dropdown-trigger slds-dropdown-trigger_click slds-m-right--medium ${showMenu ? "slds-is-open" : ""}`}
				 onMouseLeave={() => this.setState({showMenu: null})} onClick={() => this.setState({showMenu: null})}>
				<button className="slds-button slds-radio_button slds-button_icon slds-button_icon-container-more"
					onMouseEnter={e => this.setState({showMenu: window.innerWidth - e.clientX > 200 ? "left" : "right"})}>
					<svg className="slds-button__icon">
						<use xmlnsXlink="http://www.w3.org/1999/xlink"
							 xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#filter"/>
					</svg>
					<svg className="slds-button__icon slds-button__icon_x-small">
						<use xmlnsXlink="http://www.w3.org/1999/xlink"
							 xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#down"/>
					</svg>
				</button>
				<div className={`slds-m-around_none slds-dropdown slds-dropdown_${showMenu} slds-dropdown_small`}>
					<ul className="slds-dropdown__list">
						{overflow}
						<li className="slds-dropdown__item">
							<a tabIndex="0" onClick={this.createHandler}>
								<span className="slds-truncate">
									<svg className="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small">
									  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#new"/>
									</svg>Save as new filter
								</span>
							</a>
						</li>
						{selectedId != null ?
						<li className="slds-has-divider_top-space slds-dropdown__item">
							<a tabIndex="0" onClick={this.updateHandler}>
								<span className="slds-truncate">
									<svg className="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small">
									  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#save"/>
									</svg>Save changes to filter
								</span>
							</a>
						</li> : "" }
						{selectedId != null ? 
						<li className="slds-dropdown__item">
							<a tabIndex="2" onClick={this.deleteHandler}>
								<span className="slds-truncate">
									<svg className="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small">
									  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#delete"/>
									</svg>Delete selected filter
								</span>
							</a>
						</li> : "" }
						
						{this.props.filterColumns && this.props.filterColumns.length > 0 ?
						<li className="slds-has-divider_top-space slds-dropdown__item">
							<a tabIndex="3" onClick={this.clearHandler}>
							<span className="slds-truncate">
								<svg className="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small">
								  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#table"/>
								</svg>Clear filters and show everything
							</span>
							</a>
						</li> : "" }
					</ul>
				</div>
			</div>;

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
}
