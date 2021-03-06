import React from 'react';
import * as sortage from "../services/sortage";

class TabHeader extends React.Component {
	clickHandler = (event) => {
		this.props.onClick(this.props.index);
		event.preventDefault();
	};

	render() {
		// borderBottom style is required below until slds changes itself to use button
		return (
			<li className={`slds-tabs_default__item ${this.props.active ? 'slds-is-active' : ''}`}
				title={this.props.label} role="presentation">
				<button className="button-tab slds-tabs_default__link" role="tab" tabIndex="0" aria-selected="true"
				   onClick={this.clickHandler}>{this.props.label}</button>
			</li>
		);
	}
}

class Tab extends React.Component {
	render() {
		return (
			<div className={'slds-tabs_default__content' + (this.props.active ? ' slds-show' : ' slds-hide')}
				 role="tabpanel">
				{this.props.children}
			</div>
		);
	}
}

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {activeTabIndex: sortage.getTabIndex(this.props.id)};
	
		this.clickHandler = this.clickHandler.bind(this);
	}

	// Lifecycle
	render() {
		let tabHeaders = [];
		let tabs = [];
		for (let i = 0; i < this.props.children.length; i++) {
			let tab = this.props.children[i];
			tabHeaders.push(<TabHeader label={tab.props.label} index={i} key={i}
									   active={i === this.state.activeTabIndex} onClick={this.clickHandler}/>);
			tabs.push(<Tab key={tab.props.label} active={i === this.state.activeTabIndex}>{tab.props.children}</Tab>);
		}

		return (
			<div className="slds-tabs_default">
				<ul className="slds-tabs_default__nav" role="tablist">
					{tabHeaders}
				</ul>
				{tabs}
			</div>
		)
	}
	
	// Handlers
	clickHandler(index) {
		this.setState({activeTabIndex: index});
		sortage.setTabIndex(this.props.id, index);
	}
}
