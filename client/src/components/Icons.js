import React from 'react';

function getPath(category, name) {
	return `/assets/icons/${category}-sprite/svg/symbols.svg#${name}`;
}

export class Icon extends React.Component {
	static defaultProps = {
		name: "account",
		category: "standard"
	};

	render() {
		let className = "slds-icon";
		if (this.props.size) {
			className = className + " slds-icon--" + this.props.size;
		}
		if (this.props.theme) {
			className = className + " slds-icon-text-" + this.props.theme;
		}
		return (
			<svg aria-hidden="true" className={className}>;
				<use xlinkHref={getPath(this.props.category, this.props.name)}/>
			</svg>
		);
	}
}

export class HeaderIcon extends React.Component {
	static defaultProps = {
		category: "standard",
		size: "small"
	};

	render() {
		let iconStyleName = this.props.name.replace(/_/g, "-");
		let className = "slds-icon";
		if (this.props.size) {
			className = className + " slds-icon--" + this.props.size;
		}
		if (this.props.theme) {
			className = className + " slds-icon-text-" + this.props.theme;
		}
		return (
			<div className={`slds-icon_container slds-icon-${this.props.category}-${iconStyleName}`}>
				<svg aria-hidden="true" className={className}>;
					<use xlinkHref={getPath(this.props.category, this.props.name)}/>
				</svg>
			</div>);
	}
}

export class ButtonIcon extends React.Component {
	render() {
		let useTag = `<use xlink:href="${getPath("utility", this.props.name)}"/>`;
		let className = "slds-button__icon";
		if (this.props.stateful) {
			className += "--stateful";
		}
		if (this.props.position) {
			className = className + " slds-button__icon--" + this.props.position;
		}
		if (this.props.size) {
			className = className + " slds-button__icon--" + this.props.size;
		}
		if (this.props.hint) {
			className = className + " slds-button__icon--hint";
		}
		return <svg aria-hidden="true" className={className} dangerouslySetInnerHTML={{__html: useTag}}/>;
	}
}

export class InputIcon extends React.Component {
	render() {
		let useTag = `<use xlink:href="${getPath("utility", this.props.name)}"/>`;
		let className = "slds-input__icon slds-icon-text-default";
		return <svg aria-hidden="true" className={className} dangerouslySetInnerHTML={{__html: useTag}}/>;
	}
}