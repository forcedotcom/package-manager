import React from 'react';
import {Icon} from "./Icons";

class ListItem extends React.Component {
	clickHandler = () => {
		this.props.onSelect(this.props.data, this.props.label);
	};

	render() {
		return (
			<li className="slds-dropdown__item slds-has-icon--left" tabIndex="-1">
				<a tabIndex="-1" className="slds-truncate" onMouseDown={this.clickHandler}>{this.props.label}</a>
			</li>
		);
	}
}

class Dropdown extends React.Component {
	render() {
		let items = this.props.items.map((item) => <ListItem
			key={this.props.valueField ? item[this.props.valueField] : item}
			data={this.props.valueField ? item[this.props.valueField] : item}
			label={this.props.labelField ? item[this.props.labelField] : item}
			onSelect={this.props.onChange}/>);
		return (
			<div className="slds-dropdown slds-dropdown--left slds-dropdown--small slds-dropdown--menu"
				 style={{display: this.props.isOpen ? "inherit" : "none"}}>
				<ul className="slds-dropdown__list">
					{items}
				</ul>
			</div>
		);
	}
}

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			value: this.props.value,
			label: this.props.label || this.props.value || 'Select an option',
			isOpen: false
		};
	
		this.focusHandler = this.focusHandler.bind(this);
		this.blurHandler = this.blurHandler.bind(this);
		this.changeHandler = this.changeHandler.bind(this);
	}

	// Lifecycle
	render() {
		return (
			<div aria-expanded="true" className="slds-picklist" onFocus={this.focusHandler} onBlur={this.blurHandler}>
				<button className="slds-button slds-button--neutral slds-picklist__label" aria-haspopup="true">
					<span className="slds-truncate">{this.state.label}</span>
					<Icon category="utility" name="down"/>
				</button>
				<Dropdown onChange={this.changeHandler} valueField={this.props.valueField}
						  labelField={this.props.labelField} items={this.props.items} isOpen={this.state.isOpen}/>
			</div>
		);
	}
	
	// Handlers
	focusHandler() {
		this.setState({isOpen: true});
	}

	blurHandler(value, label) {
		this.setState({isOpen: false});
	}

	changeHandler(value, label) {
		this.setState({value: value, label: label, isOpen: false});
		this.props.onChange(value, label);
	}
}