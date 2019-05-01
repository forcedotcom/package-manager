import React from 'react';
import {Icon} from "./Icons";

class ListItem extends React.Component {
	clickHandler = () => {
		this.props.onSelect(this.props.data, this.props.label);
	};

	render() {
		return (
			<li role="presentation" className="slds-listbox__item" onMouseDown={this.clickHandler}>
				<div id="option1" style={this.props.isSelected ? {backgroundColor: "#f3f3f3"} : {}}
					 className="slds-media slds-listbox__option slds-listbox__option_plain slds-media_small"
					 aria-selected={this.props.isSelected} role="option">
					<span className="slds-media__figure slds-listbox__option-icon"/>
					<span className="slds-media__body">
						<span className="slds-truncate" title={this.props.label}>{this.props.label}</span>
					</span>
				</div>
			</li>
		);
	}
}

class Droplist extends React.Component {
	render() {
		let items = this.props.items.map((item, index) => <ListItem
			isSelected={this.props.selected === index}
			key={this.props.valueField ? item[this.props.valueField] : item}
			data={this.props.valueField ? item[this.props.valueField] : item}
			label={this.props.labelField ? item[this.props.labelField] : item}
			onSelect={this.props.onChange}/>);
		return (
			<div id="droplist" className="slds-dropdown  slds-dropdown_fluid" role="listbox">
				<ul className="slds-listbox slds-listbox_vertical" role="presentation">
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
			isOpen: false,
			selected: this.props.items.findIndex(item => this.props.valueField ? item[this.props.valueField] === this.props.value : item === this.props.value)
		};
	
		this.keyHandler = this.keyHandler.bind(this);
		this.clickHandler = this.clickHandler.bind(this);
		this.focusHandler = this.focusHandler.bind(this);
		this.blurHandler = this.blurHandler.bind(this);
		this.changeHandler = this.changeHandler.bind(this);
	}

	// Lifecycle
	render() {
		return (
			<div className="slds-combobox_container" onKeyDown={this.keyHandler}>
				<div className={`slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click ${this.state.isOpen ? "slds-is-open" : ""}`}
					 aria-controls="droplist" aria-expanded={this.state.isOpen} aria-haspopup="listbox" role="combobox"
					 onMouseDown={this.clickHandler} onFocus={this.focusHandler} onBlur={this.blurHandler}>
					<div className="slds-combobox__form-element slds-input-has-icon slds-input-has-icon_right"
						 role="none">
						<input type="text" autoFocus={this.props.autoFocus} className="slds-input slds-combobox__input"
							   aria-controls="listbox-id-1" autoComplete="off"
							   placeholder={this.state.label} readOnly={true}/>
						<span
							className="slds-icon_container slds-icon-utility-down slds-input__icon slds-input__icon_right">
							<Icon category="utility" size="x-small" theme="default" name="down"/>
						</span>
					</div>
					<Droplist onChange={this.changeHandler} valueField={this.props.valueField} selected={this.state.selected}
						  labelField={this.props.labelField} items={this.props.items} isOpen={this.state.isOpen}/>
				</div>
			</div>
		);
	}
	
	// Handlers
	keyHandler(event) {
		let selected = this.state.selected;
		switch(event.key) {
			case "Escape":
				this.setState({isOpen: false});
				break;
			case "ArrowUp":
				if (this.state.isOpen) {
					selected--;
					if (selected < 0)
						selected = this.props.items.length-1;
				}

				this.setState({isOpen: true, selected});
				break;
			case "ArrowDown":
				if (this.state.isOpen) {
					selected++;
					if (selected > this.props.items.length - 1)
						selected = 0;
				}
				this.setState({isOpen: true, selected});
				break;
			case "Enter":
				const item = this.props.items[this.state.selected];
				this.changeHandler(
					this.props.valueField ? item[this.props.valueField] : item,
					this.props.labelField ? item[this.props.labelField] : item);
				break;
			default:
				return;

		}
		event.preventDefault();
	}

	clickHandler() {
		this.setState({isOpen: true});
	}

	focusHandler() {
		// this.setState({isOpen: true});
	}

	blurHandler() {
		this.setState({isOpen: false});
	}

	changeHandler(value, label) {
		this.setState({value, label, isOpen: false});
		this.props.onChange(value, label);
	}
}