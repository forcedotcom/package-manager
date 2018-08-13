import React from 'react';

const qs = require('query-string');

export default class extends React.Component {
	state = {};

	componentDidMount() {
		const params = qs.parse(this.props.location.search);
		if (params.message) {
			this.setState({...params})
		} else {
			if (params.redirectTo) {
				window.location.href = params.redirectTo;
			}
		}
	}

	render() {
		return (
			<div>
				{this.state.message ?
					<section role="alertdialog" aria-labelledby="prompt-heading-id"
							 aria-describedby="prompt-message-wrapper"
							 className="slds-modal slds-fade-in-open slds-modal_prompt" aria-modal="true">
						<div className="slds-modal__container">
							<header className="slds-modal__header slds-theme_error slds-theme_alert-texture">
								<button
									className="slds-button slds-button_icon slds-modal__close slds-button_icon-inverse"
									title="Close">
									<svg className="slds-button__icon slds-button__icon_large" aria-hidden="true">
										<use xmlnsXlink="http://www.w3.org/1999/xlink"
											 xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#close"/>
									</svg>
									<span className="slds-assistive-text">Close</span>
								</button>
								<h2 className="slds-text-heading_medium" id="prompt-heading-id">Sorry about
									this</h2>
							</header>
							<div className="slds-modal__content slds-p-around_medium" id="prompt-message-wrapper">
								<p><b>{this.state.message}</b></p>
								<p>
									<b>Severity:</b> {this.state.severity}<br/>
									<b>Error code:</b> {this.state.code}<br/>
								</p>
							</div>
						</div>
					</section> : ""}
				<div className="slds-backdrop slds-backdrop_open"/>
			</div>
		);
	}
}