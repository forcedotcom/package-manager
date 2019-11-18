import React from 'react';

import {HeaderIcon} from "./Icons";
import moment from "moment/moment";
import {Helmet} from "react-helmet";


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
						<p className="slds-text-body--regular slds-truncate" style={style} title={this.props.detail? this.props.detail : ""}>{value}</p>
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
			if (currentAction.hidden) {
				continue;
			}

			const btn =
				currentAction.props ? currentAction : // Bad test for whether this is a react component :(
					typeof currentAction.toggled !== "undefined" ? currentAction.disabled ? "" :
						<ToggleButton key={currentAction.label} label={currentAction.label} detail={currentAction.detail} toggled={currentAction.toggled}
									  iconOn={currentAction.iconOn || currentAction.icon} iconOff={currentAction.iconOff || currentAction.icon}
									  handler={currentAction.handler}/> :
						<button title={currentAction.detail} key={currentAction.label}
								disabled={currentAction.disabled || currentAction.spinning}
								className="slds-button slds-button--neutral" onClick={currentAction.handler}>
							{currentAction.spinning ?
								<div style={{width: "3em"}}>&nbsp;
									<div role="status" className="slds-spinner slds-spinner_x-small">
										<div className="slds-spinner__dot-a"/>
										<div className="slds-spinner__dot-b"/>
									</div>
								</div> : currentAction.label}
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
				<div className="slds-grid" >
					<div className="slds-col slds-p-right--small">
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
			if (currentAction.hidden) {
				continue;
			}
			const btn =
				currentAction.props ? currentAction : // Bad test for whether this is a react component :(
					typeof currentAction.toggled !== "undefined" ? currentAction.disabled ? "" :
						<ToggleButton key={currentAction.label} label={currentAction.label} detail={currentAction.detail} toggled={currentAction.toggled}
									  iconOn={currentAction.iconOn || currentAction.icon} iconOff={currentAction.iconOff || currentAction.icon}
									  handler={currentAction.handler}/> :
						<button title={currentAction.detail} key={currentAction.label}
								disabled={currentAction.disabled || currentAction.spinning}
								className="slds-button slds-button--neutral" onClick={currentAction.handler}>
							{currentAction.spinning ?
								<div style={{width: "3em"}}>&nbsp;
									<div role="status" className="slds-spinner slds-spinner_x-small">
										<div className="slds-spinner__dot-a"/>
										<div className="slds-spinner__dot-b"/>
									</div>
								</div> : currentAction.label}
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
					</div>
					<div className="slds-col slds-no-flex slds-align-bottom">
						{actionBar}
					</div>
				</div>
				<p className="slds-m-top--xxx-small slds-text-body--small">{this.props.count ? (this.props.count > 0 ? ` ${this.props.count} records found` :
						<span className="slds-p-around_none slds-icon-typing slds-is-animated" title="Loading records">
						  <span className="slds-icon-typing__dot" style={{height: ".5em", width: ".5em"}}/>
						  <span className="slds-icon-typing__dot" style={{height: ".5em", width: ".5em"}}/>
						  <span className="slds-icon-typing__dot" style={{height: ".5em", width: ".5em"}}/>
						</span>
				) : <br/>}</p>
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
			if (currentAction.hidden) {
				continue;
			}

			const btn =
				currentAction.props ? currentAction : // Bad test for whether this is a react component :(
					typeof currentAction.toggled !== "undefined" ? currentAction.disabled ? "" :
						<ToggleButton key={currentAction.label} label={currentAction.label} detail={currentAction.detail} toggled={currentAction.toggled}
									  iconOn={currentAction.iconOn || currentAction.icon} iconOff={currentAction.iconOff || currentAction.icon}
									  handler={currentAction.handler}/> :
						<button title={currentAction.detail} key={currentAction.label}
								disabled={currentAction.disabled || currentAction.spinning}
								className="slds-button slds-button--neutral" onClick={currentAction.handler}>
							{currentAction.spinning ?
								<div style={{width: "3em"}}>&nbsp;
									<div role="status" className="slds-spinner slds-spinner_x-small">
										<div className="slds-spinner__dot-a"/>
										<div className="slds-spinner__dot-b"/>
									</div>
								</div> : currentAction.label}
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
					<div className="slds-col slds-p-right--small">
						<div className="slds-media">
							<div className="slds-media__figure">
								<HeaderIcon name={this.props.icon.name} category={this.props.icon.category}
											size="large"/>
							</div>
							<div className="slds-media__body">
								<p className="slds-text-heading--label">{this.props.type}</p>
								<div className="slds-grid">
									<h1 className="slds-text-heading--medium slds-m-right--small slds-align-middle"
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
		let actions = this.props.actions || [];
		let groups = [];
		let currentGroup = null;
		for (let i = 0; i < actions.length; i++) {
			const currentAction = actions[i];
			if (currentAction.hidden) {
				continue;
			}

			const btn =
				currentAction.props ? currentAction : // Bad test for whether this is a react component :(
					typeof currentAction.toggled !== "undefined" ? currentAction.disabled ? "" :
						<ToggleButton key={currentAction.label} label={currentAction.label} detail={currentAction.detail} toggled={currentAction.toggled}
									  iconOn={currentAction.iconOn || currentAction.icon} iconOff={currentAction.iconOff || currentAction.icon}
									  handler={currentAction.handler}/> :
						<button title={currentAction.detail} key={currentAction.label}
								disabled={currentAction.disabled || currentAction.spinning}
								className="slds-button slds-button--neutral" onClick={currentAction.handler}>
							{currentAction.spinning ?
								<div style={{width: "3em"}}>&nbsp;
									<div role="status" className="slds-spinner slds-spinner_x-small">
										<div className="slds-spinner__dot-a"/>
										<div className="slds-spinner__dot-b"/>
									</div>
								</div> : currentAction.label}
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
				<Helmet>
					<title>SteelBrick PM: {this.props.title}</title>
				</Helmet>
				<div className="slds-grid">
					<div className="slds-col slds-p-right--small">
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
							<div className="slds-button-group slds-button-space-left" role="group">
								{actionBar}
							</div>
						</div>
					</div>
				</div>
				<p className="slds-text-body--small slds-m-top--x-small">{this.props.count ? (this.props.count > 0 ? ` ${this.props.count} records found` :
						<span className="slds-p-around_none slds-icon-typing slds-is-animated" title="Loading records">
						  <span className="slds-icon-typing__dot" style={{height: ".5em", width: ".5em"}}/>
						  <span className="slds-icon-typing__dot" style={{height: ".5em", width: ".5em"}}/>
						  <span className="slds-icon-typing__dot" style={{height: ".5em", width: ".5em"}}/>
						</span>
				) : <br/>}</p>
				{this.props.children ?
					<div className="slds-grid slds-page-header__detail-row">{this.props.children}</div> : ""}
			</div>
		);
	}
}

export class ToggleButton extends React.Component {
	render() {
		const iconOff = this.props.iconOff || "add";
		const iconOn = this.props.iconOn || "check";
		return (
			<button title={this.props.detail} className={`slds-button slds-button_stateful ${this.props.toggled ? "slds-button_brand slds-is-selected-clicked" : "slds-button_neutral slds-not-selected"}`}
					onClick={this.props.handler}>
  				<span className="slds-text-not-selected">
					{iconOff !== 'none' ? <svg style={{marginBottom: ".18em"}} className="slds-button__icon_stateful slds-button__icon_left">
						<use xlinkHref={`/assets/icons/utility-sprite/svg/symbols.svg#${iconOff}`}/>
					</svg> : ''}{this.props.label}</span>
				<span className="slds-text-selected">
					{iconOn !== 'none' ? <svg style={{marginBottom: ".18em"}} className="slds-button__icon_stateful slds-button__icon_left">
						<use xlinkHref={`/assets/icons/utility-sprite/svg/symbols.svg#${iconOn}`}/>
					</svg> : ''}{this.props.label}</span>
			</button>
		);
	}
}