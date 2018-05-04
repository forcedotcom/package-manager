import React from 'react';

import {HeaderIcon, InputIcon} from "./Icons";

class LookupItem extends React.Component {
    clickHandler = (event) => {
        this.props.onSelect(this.props.data[this.props.valueField], this.props.data[this.props.labelField]);
        event.preventDefault();
    };

    render() {
        return (
            <li className="slds-listbox__item" onClick={this.clickHandler}>
                <div id="listbox-option-unique-id-01"
                     className="slds-media slds-listbox__option slds-listbox__option_entity slds-listbox__option_has-meta">
                  <span className="slds-media__figure">
                    <HeaderIcon name={this.props.icon.name} category={this.props.icon.category}/>
                  </span>
                <span className="slds-media__body">
                    <span className="slds-listbox__option-text slds-listbox__option-text_entity">{this.props.data[this.props.labelField]}</span>
                    <span className="slds-listbox__option-meta slds-listbox__option-meta_entity">{this.props.data[this.props.descriptionField]}</span>
                  </span>
                </div>
            </li>
        );

    }
}

class ListBox extends React.Component {
    state = {items: [], opened: false};

    componentWillReceiveProps(props) {
        if (props.items) {
            this.setState({items: props.items, opened: true});
        }
    }

    render() {
        let lookupItems = this.state.items.map(item => <LookupItem key={item[this.props.valueField]} data={item} valueField={this.props.valueField} 
                                                                   labelField={this.props.labelField} descriptionField={this.props.descriptionField} 
                                                                   onSelect={this.props.onChange} icon={this.props.icon}/>);
        return (
            <div id="listbox-unique-id">
                <ul className="slds-listbox slds-listbox_vertical slds-dropdown slds-dropdown_fluid">
                {lookupItems}
                </ul>
            </div>
        );

    }
}

export default class extends React.Component {
    state = {
        opened: false,
        value: "",
        placeholder: this.props.placeholder || 'Enter text to search'
    };

    componentWillReceiveProps(props) {
        this.setState({opened: props.items.length > 0 ? true : false});
    }
    
    searchKeyChangeHandler = (key) => {
        this.setState({value : key.target.value});
        this.props.onSearchKeyChange(key);
    };
    
    changeHandler = (value, label) => {
        this.setState({value: label, items: [], opened: false});
        if (this.props.onChange) {
            this.props.onChange(value, label);
        }
    };

    render() {
        return (
            <div className={`slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click slds-combobox-lookup ${this.state.opened ? 'slds-is-open' : ''}`}>
                <div className="slds-combobox__form-element slds-input-has-icon slds-input-has-icon_right">
                    <InputIcon name="search"/>
                    <input id="combobox" className="slds-input slds-combobox__input" type="text" placeholder={this.state.placeholder} 
                           onChange={this.searchKeyChangeHandler} value={this.state.value}/>
                    <ListBox valueField={this.props.valueField} opened={this.state.opened} labelField={this.props.labelField} 
                             descriptionField={this.props.descriptionField} items={this.props.items} onChange={this.changeHandler.bind(this)}
                             icon={this.props.icon}/>
                </div>
            </div>
        );
    }
}