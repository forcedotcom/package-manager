import React from 'react';

import {ButtonIcon, Icon} from "./Icons";

export class DropdownItem extends React.Component {
	clickHandler = (event) => {
		event.preventDefault();
		this.props.onSelect(this.props.value, this.props.label, this.props.icon);
	};

	render() {
		// slds-has-icon--left
		return (
			<li className="slds-dropdown__item" role="menuitem option" aria-selected={this.props.selected}
				tabIndex="-1">
				<a tabIndex="-1" className="slds-truncate" onClick={this.clickHandler}>
					{this.props.label}
					{this.props.icon ?
						<Icon category="utility" name={this.props.icon} size="small" position="right"/>
						: ""}
				</a>
			</li>
		);
	}
}

class Dropdown extends React.Component {
	static defaultProps = {position: "right"};

	render() {
		let items = this.props.items.map((item) => React.cloneElement(item, {onSelect: this.props.onChange}));
		let className = "slds-dropdown slds-dropdown--menu";
		if (this.props.position) className = className + " slds-dropdown--" + this.props.position;
		if (this.props.size) className = className + " slds-dropdown--" + this.props.size;
		return (
			<div className={className}>
				{this.props.header ?
					<div className="slds-dropdown__header">
						<span className="slds-text-heading--label">{this.props.header}</span>
					</div> : ""}
				<ul className="slds-dropdown__list" role="menu">
					{items}
				</ul>
			</div>
		);
	}
}

export class ButtonDropdown extends React.Component {
	static defaultProps = {
		valueField: "value",
		labelField: "label",
		iconField: "icon"
	};

	state = {
		value: this.props.value,
		label: this.props.label || 'Select an option'
	};

	changeHandler = (value, label, icon) => {
		this.setState({value: value, label: label, icon: icon, opened: false});
		this.props.onChange(value, label);
	};

	render() {
		let icon;
		let items = this.props.children;
		for (let i = 0; i < items.length; i++) {
			let item = items[i];
			if (item.props[this.props.valueField] === this.state.value) {
				icon = item.props[this.props.iconField];
				break;
			}
		}
		let className = "slds-button slds-button--icon-more";
		return (
			<div className="slds-dropdown-trigger" aria-haspopup="true">
				<button className={className} aria-haspopup="true">
					<ButtonIcon name={icon || this.props.icon}/>
					<span className="slds-assistive-text">Settings</span>
					<ButtonIcon name="down" size="x-small"/>
					<span className="slds-assistive-text">More</span>
				</button>
				<Dropdown header={this.props.header}
						  valueField={this.props.valueField}
						  labelField={this.props.labelField}
						  items={this.props.children}
						  size="small"
						  onChange={this.changeHandler}/>
			</div>
		);
	}
}

export class ActionButton extends React.Component {
	changeHandler = (value, label) => {
		this.setState({value: value, label: label, opened: false});
		this.props.onChange(value, label);
	};

	render() {
		return (
			<div className="slds-dropdown-trigger" aria-haspopup="true">
				<button className="slds-button slds-button--icon-border-filled slds-button--icon-border-small">
					<ButtonIcon name="down" size="small"/>
					<span className="slds-assistive-text">More</span>
				</button>
				<Dropdown header={this.props.header}
						  valueField={this.props.valueField}
						  labelField={this.props.labelField}
						  items={this.props.children}
						  onChange={this.changeHandler}/>
			</div>
		);
	}
}


