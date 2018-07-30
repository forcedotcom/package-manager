import React from 'react';
import ReactTooltip from 'react-tooltip';

import {HeaderIcon} from "./Icons";
import {ButtonDropdown, DropdownItem} from "./Dropdown";
import moment from "moment/moment";

export class HeaderNote extends React.Component {
	render() {
		return (
			<div className="slds-scoped-notification slds-media slds-media_center slds-p-around_none">
				<div className="slds-media__figure">
                    <span className={`slds-icon_container slds-icon-utility-${this.props.type || "info"}`}
						  title="information">
                      <svg className="slds-icon slds-icon_small slds-icon-text-default">
                        <use xmlnsXlink="http://www.w3.org/1999/xlink"
							 xlinkHref={`/assets/icons/utility-sprite/svg/symbols.svg#${this.props.type || "info"}`}/>
                      </svg>
                    </span>
				</div>
				<div className="slds-media__body">
					<p>{this.props.children}</p>
				</div>
			</div>
		);
	}
}

export class HeaderField extends React.Component {
	render() {

		let value = this.props.value;
		if (this.props.format === "currency") {
			value = parseFloat(value).toLocaleString('en-US', {style: 'currency', currency: 'USD'});
		} else if (this.props.format === "date") {
			value = moment(value).format("ll");
		} else if (this.props.format === "datetime") {
			value = moment(value).format("lll");
		}

		let style = this.props.style || {};
		return (
			<div className="slds-col--padded">
				<dl>
					<dt>
						<p className="slds-text-heading--label slds-truncate" style={style}>{this.props.label}</p>
					</dt>
					<dd>
						<p className="slds-text-body--regular slds-truncate" style={style} title={value}>{value}</p>
					</dd>
				</dl>
			</div>
		);
	}
}

export class RecordHeader extends React.Component {
	static defaultProps = {
		icon: {name: "account", category: "standard"}
	};

	render() {
		let actions = this.props.actions || [];
		let groups = [];
		let currentGroup = null;
		for (let i = 0; i < actions.length; i++) {
			const currentAction = actions[i];
			const btn =
				currentAction.props ? currentAction : // Bad test for whether this is a react component :(
				typeof currentAction.toggled !== "undefined" ? currentAction.disabled ? "" :
					<ToggleButton key={currentAction.label} label={currentAction.label} detail={currentAction.detail} toggled={currentAction.toggled} handler={currentAction.handler}/> :
					<button data-tip={currentAction.detail} key={currentAction.label}
							disabled={currentAction.disabled || currentAction.spinning}
							className="slds-button slds-button--neutral" onClick={currentAction.handler}>
						{currentAction.spinning ?
							<div style={{width: "3em"}}>&nbsp;
								<div role="status" className="slds-spinner slds-spinner_x-small">
									<div className="slds-spinner__dot-a"/>
									<div className="slds-spinner__dot-b"/>
								</div>
							</div> : currentAction.label}
						{currentAction.detail ?
							<ReactTooltip place="left" effect="solid" delayShow={900} type="info"/> : ''}
					</button>;
			const currentActionGroup = currentAction.group || (currentAction.props ? currentAction.props.group : null);
			if (currentAction.spinning || currentGroup == null || currentGroup.key !== currentActionGroup) {
				currentGroup = {key: currentActionGroup, actions: [btn]};
				groups.push(currentGroup);
			} else {
				currentGroup.actions.push(btn);
			}
		}

		let actionBar = [];
		for (let i = 0; i < groups.length; i++) {
			actionBar.push(<div key={i} className="slds-button-group" role="group">{groups[i].actions}</div>);
		}
		return (
			<div className="slds-page-header">
				<div className="slds-grid">
					<div className="slds-col slds-has-flexi-truncate">
						<div className="slds-media">
							<div className="slds-media__figure">
								<HeaderIcon name={this.props.icon.name} category={this.props.icon.category} size="large"/>
							</div>
							<div className="slds-media__body">
								<p className="slds-text-heading--label">{this.props.parent ? <Breadcrumb target={this.props.parent}/> : ""}{this.props.type}</p>
								<div className="slds-grid">
									<h1 className="slds-text-heading--medium slds-m-right--small slds-truncate slds-align-middle"
										title={this.props.title}>{this.props.title}</h1>
								</div>
							</div>
						</div>
					</div>
					<div className="slds-col slds-no-flex slds-align-bottom">
						{actionBar}
					</div>
				</div>
				{this.props.notes ?
					<div className="slds-grid slds-page-header__detail-row">
						{this.props.notes}
					</div> : ""}
				{this.props.children ?
					<div className="slds-grid slds-page-header__detail-row">
						{this.props.children}
					</div> : ""}
			</div>
		);
	}
}

class Breadcrumb extends React.Component {
	render() { 
		return <span><a href={this.props.target.location}>{this.props.target.label}</a> <span className="slds-text-heading--small">::</span> </span> 
	}
}

export class CardHeader extends React.Component {
	static defaultProps = {
		icon: {name: "account", category: "standard"}
	};

	render() {
		let actions = this.props.actions || [];
		let groups = [];
		let currentGroup = null;
		for (let i = 0; i < actions.length; i++) {
			const currentAction = actions[i];
			const btn =
				currentAction.props ? currentAction : // Bad test for whether this is a react component :(
				typeof currentAction.toggled !== "undefined" ? currentAction.disabled ? "" :
					<ToggleButton key={currentAction.label} label={currentAction.label} detail={currentAction.detail} toggled={currentAction.toggled} handler={currentAction.handler}/> :
					<button data-tip={currentAction.detail} key={currentAction.label}
							disabled={currentAction.disabled || currentAction.spinning}
							className="slds-button slds-button--neutral" onClick={currentAction.handler}>
						{currentAction.spinning ?
							<div style={{width: "3em"}}>&nbsp;
								<div role="status" className="slds-spinner slds-spinner_x-small">
									<div className="slds-spinner__dot-a"/>
									<div className="slds-spinner__dot-b"/>
								</div>
							</div> : currentAction.label}
						{currentAction.detail ?
							<ReactTooltip place="left" effect="solid" delayShow={900} type="info"/> : ''}
					</button>;
			const currentActionGroup = currentAction.group || (currentAction.props ? currentAction.props.group : null);
			if (currentAction.spinning || currentGroup == null || currentGroup.key !== currentActionGroup) {
				currentGroup = {key: currentActionGroup, actions: [btn]};
				groups.push(currentGroup);
			} else {
				currentGroup.actions.push(btn);
			}
		}

		let actionBar = [];
		for (let i = 0; i < groups.length; i++) {
			actionBar.push(<div key={i} className="slds-button-group" role="group">{groups[i].actions}</div>);
		}
		return (
			<header className="slds-card__header slds-form--stacked">
				<div className="slds-media slds-media--center slds-has-flexi-truncate">
					<div className="slds-media__figure">
						<HeaderIcon name={this.props.icon.name} category={this.props.icon.category} size="small"/>
					</div>
					<div className="slds-media__body">
						<h3 className="slds-text-heading--small slds-truncate"
							title={this.props.title}>{this.props.title}</h3>
						<p className="slds-text-body--small">{this.props.count} found</p>
					</div>
					<div className="slds-col slds-no-flex slds-align-bottom">
						{actionBar}
					</div>
				</div>
				{this.props.children ?
					<div className="slds-p-top--x-small">
						{this.props.children}
					</div> : ""}
			</header>
		);
	}
}

export class FormHeader extends React.Component {
	static defaultProps = {
		icon: {name: "account", category: "standard"}
	};

	render() {
		let actions = this.props.actions || [
			{handler: this.props.onSave, label: "Save"},
			{handler: this.props.onCancel, label: "Cancel"}];

		let groups = [];
		let currentGroup = null;
		for (let i = 0; i < actions.length; i++) {
			const currentAction = actions[i];
			const btn =
				currentAction.props ? currentAction : // Bad test for whether this is a react component :(
				typeof currentAction.toggled !== "undefined" ? currentAction.disabled ? "" :
					<ToggleButton key={currentAction.label} label={currentAction.label} detail={currentAction.detail} toggled={currentAction.toggled} handler={currentAction.handler}/> :
					<button data-tip={currentAction.detail} key={currentAction.label}
							disabled={currentAction.disabled || currentAction.spinning}
							className="slds-button slds-button--neutral" onClick={currentAction.handler}>
						{currentAction.spinning ?
							<div style={{width: "3em"}}>&nbsp;
								<div role="status" className="slds-spinner slds-spinner_x-small">
									<div className="slds-spinner__dot-a"/>
									<div className="slds-spinner__dot-b"/>
								</div>
							</div> : currentAction.label}
						{currentAction.detail ?
							<ReactTooltip place="left" effect="solid" delayShow={900} type="info"/> : ''}
					</button>;
			const currentActionGroup = currentAction.group || (currentAction.props ? currentAction.props.group : null);
			if (currentAction.spinning || currentGroup == null || currentGroup.key !== currentActionGroup) {
				currentGroup = {key: currentActionGroup, actions: [btn]};
				groups.push(currentGroup);
			} else {
				currentGroup.actions.push(btn);
			}
		}

		let actionBar = [];
		for (let i = 0; i < groups.length; i++) {
			actionBar.push(<div key={i} className="slds-button-group" role="group">{groups[i].actions}</div>);
		}

		return (
			<div style={{borderLeft: 0, borderRight: 0, borderRadius: "0.25rem 0.25rem 0 0", zIndex: 2}}
				 className="slds-page-header">
				<div className="slds-grid">
					<div className="slds-col slds-has-flexi-truncate">
						<div className="slds-media">
							<div className="slds-media__figure">
								<HeaderIcon name={this.props.icon.name} category={this.props.icon.category}
											size="large"/>
							</div>
							<div className="slds-media__body">
								<p className="slds-text-heading--label">{this.props.type}</p>
								<div className="slds-grid">
									<h1 className="slds-text-heading--medium slds-m-right--small slds-truncate slds-align-middle"
										title={this.props.title}>{this.props.title}</h1>
								</div>
							</div>
						</div>
					</div>
					<div className="slds-col slds-no-flex slds-align-bottom">
						{actionBar}
					</div>
				</div>
				{this.props.children ?
					<div className="slds-grid slds-page-header__detail-row">{this.props.children}</div> : ""}
			</div>
		);
	}
}

export class HomeHeader extends React.Component {
	static defaultProps = {
		newLabel: "New",
		icon: {name: "account", category: "standard"}
	};

	render() {
		let viewItems = null;
		if (this.props.viewOptions) {
			let dropdown = this.props.viewOptions.map(item => <DropdownItem key={item.label} value={item.value}
																			label={item.label} icon={item.icon}/>);
			viewItems = <ButtonDropdown header="Display as" iconMore={true} value={this.props.viewOptions[0].value}
										onChange={this.props.onViewChange}>{dropdown}</ButtonDropdown>
		}

		let sortItems = null;
		if (this.props.sortOptions) {
			let dropdown = this.props.sortOptions.map(item => <DropdownItem key={item.label} value={item.value}
																			label={item.label}/>);
			sortItems = <ButtonDropdown header="Sort By" icon="sort" iconMore={true}
										onChange={this.props.onSort}>{dropdown}</ButtonDropdown>
		}

		let actions = this.props.actions || [];
		let groups = [];
		let currentGroup = null;
		for (let i = 0; i < actions.length; i++) {
			const currentAction = actions[i];
			const btn =
				currentAction.props ? currentAction : // Bad test for whether this is a react component :(  
				typeof currentAction.toggled !== "undefined" ? currentAction.disabled ? "" :
					<ToggleButton key={currentAction.label} label={currentAction.label} detail={currentAction.detail} toggled={currentAction.toggled} handler={currentAction.handler}/> :
					<button data-tip={currentAction.detail} key={currentAction.label}
							disabled={currentAction.disabled || currentAction.spinning}
							className="slds-button slds-button--neutral" onClick={currentAction.handler}>
						{currentAction.spinning ?
							<div style={{width: "3em"}}>&nbsp;
								<div role="status" className="slds-spinner slds-spinner_x-small">
									<div className="slds-spinner__dot-a"/>
									<div className="slds-spinner__dot-b"/>
								</div>
							</div> : currentAction.label}
						{currentAction.detail ?
							<ReactTooltip place="left" effect="solid" delayShow={900} type="info"/> : ''}
					</button>;
			const currentActionGroup = currentAction.group || (currentAction.props ? currentAction.props.group : null);
			if (currentAction.spinning || currentGroup == null || currentGroup.key !== currentActionGroup) {
				currentGroup = {key: currentActionGroup, actions: [btn]};
				groups.push(currentGroup);
			} else {
				currentGroup.actions.push(btn);
			}
		}

		let actionBar = [];
		for (let i = 0; i < groups.length; i++) {
			actionBar.push(<div key={i} className="slds-button-group" role="group">{groups[i].actions}</div>);
		}

		return (
			<div className="slds-page-header">
				<div className="slds-grid">
					<div className="slds-col slds-has-flexi-truncate">
						<p className="slds-text-heading--label">{this.props.type}</p>
						<div className="slds-grid">
							<div className="slds-grid slds-type-focus slds-no-space">
								<h1 className="slds-text-heading--medium slds-truncate"
									title={this.props.title}>{this.props.title}</h1>
							</div>
						</div>
					</div>
					<div className="slds-col slds-no-flex slds-align-bottom">
						<div className="slds-grid">
							<div className="slds-button-space-left">
								{viewItems}
							</div>
							<div className="slds-button-space-left">
								{sortItems}
							</div>
							<div className="slds-button-group slds-button-space-left" role="group">
								{actionBar}
							</div>
						</div>
					</div>
				</div>
				{this.props.itemCount ?
					<p className="slds-text-body--small slds-m-top--x-small">{this.props.itemCount} found</p> :
					<p>&nbsp;</p>}
				{this.props.children ?
					<div className="slds-grid slds-page-header__detail-row">{this.props.children}</div> : ""}
			</div>
		);
	}
}

export class ToggleButton extends React.Component {
	render() {
		return (
			<button data-tip={this.props.detail} className={`slds-button slds-button_stateful ${this.props.toggled ? "slds-button_brand slds-is-selected-clicked" : "slds-button_neutral slds-not-selected"}`}
					onClick={this.props.handler}>
  				<span className="slds-text-not-selected">
					<svg className="slds-button__icon_stateful slds-button__icon_left">
					  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#add"/>
					</svg>{this.props.label}</span>
				<span className="slds-text-selected">
					<svg className="slds-button__icon_stateful slds-button__icon_left">
					  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#check"/>
					</svg>{this.props.label}</span>
				{this.props.detail ?
					<ReactTooltip place="left" effect="solid" delayShow={900} type="info"/> : ''}
			</button>
		);
	}
}