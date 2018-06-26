import React from 'react';
import {NotificationManager} from 'react-notifications';


export default class extends React.Component {

	handleKeyDown = (e) => {
		switch (e.key) {
			case "Escape":
				this.props.onClose();
				return false;
			default:
				return true;
		}
	};

	dontCloseHandler = (e) => {
		if (!e.target.type) {
			e.stopPropagation();
		}
	};

	copyHandler = () => {
		let clippy = document.getElementById("clippy");
		clippy.value = this.props.message;
		clippy.select();
		document.execCommand("copy");
		NotificationManager.success("Copied message text to clipboard", "Done", 1000);
		this.props.onClose();
	};

	render() {
		let messages;
		try {
			messages = JSON.parse(this.props.message);
		} catch (e) {
			messages = this.props.message;
		}
		let messageBody = messages.map ?
			<ol className="slds-has-dividers_top-space">{messages.map((m, i) => {
				if (typeof m === "object") {
					return <li className="slds-item" key={`error-${i}`}>
						<div className="slds-text-title_caps">{m.title}</div>
						<div className="slds-text-color_error">{m.details}</div>
						<pre>{m.message}</pre>
					</li>;
				} else {
					return <li key={`error-${i}`}>
						<pre>{m}</pre>
					</li>
				}
			})}</ol> :
			<p>{messages}</p>;

		return (
			<div onClick={this.props.onClose} tabIndex="0" onKeyDown={this.handleKeyDown}>
				<section className="slds-modal slds-fade-in-open slds-modal_prompt">
					<div onClick={this.dontCloseHandler} className="slds-modal__container">
						<header className="slds-modal__header slds-theme_error slds-theme_alert-texture">
							<button className="slds-button slds-button_icon slds-modal__close slds-button_icon-inverse"
									title="Close">
								<svg className="slds-button__icon slds-button__icon_large">
									<use xmlnsXlink="http://www.w3.org/1999/xlink"
										 xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#close"/>
								</svg>
								<span className="slds-assistive-text">Close</span>
							</button>
							<h2 className="slds-text-heading_medium" id="prompt-heading-id">{this.props.subject}</h2>
						</header>
						<div className="slds-modal__content slds-p-around_medium" id="prompt-message-wrapper">
							{messageBody}
						</div>
						<footer className="slds-modal__footer slds-theme_default">
							<button className="slds-button slds-button_neutral" onClick={this.copyHandler}>Copy to
								clipboard
							</button>
							<button autoFocus="true" className="slds-button slds-button_neutral"
									onClick={this.props.onClose}>Close
							</button>
						</footer>
					</div>
				</section>
				<div className="slds-backdrop slds-backdrop_open"/>
				<div style={{position: "absolute", opacity: 0}}><input type="text" id="clippy"/></div>
			</div>
		);
	}
}