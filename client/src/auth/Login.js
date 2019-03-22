import React from 'react';
import qs from 'query-string';

import * as authService from "../services/AuthService";
import moment from "moment";

const DEFAULT_ICON = `/assets/icons/standard/process_120.png`;
const HAL_ICON = `/assets/icons/evil/hal_256.png`;

export default class extends React.Component {
	constructor(props) {
		super(props);
		authService.invalidateUser();

		let goodDay = () => {
			const hour = parseFloat(moment().format("HH"));
			return `Good ${hour < 5 ? "Night" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"}`;
		};

		const WELCOMONING = [
			"How many roads must a man walk down?", DEFAULT_ICON,
			"Welcome to the jungle.", DEFAULT_ICON,
			"Get that corn outta my face!", DEFAULT_ICON,
			`${goodDay()}, Dave.`, HAL_ICON,
			"'All you need is love' - the Beatles.", DEFAULT_ICON,
			"'All you need is dung' - the Beetles.", DEFAULT_ICON,
			"Winter is coming.", DEFAULT_ICON,
			"Hear that? That is the sound of a man trying to gargle while fighting off a pack of wolves.", DEFAULT_ICON,
			"Welcome to the machine.", DEFAULT_ICON,
			"Do not make me regret this.", DEFAULT_ICON,
			"Look both ways before crossing.", DEFAULT_ICON,
			"Mind the gap.", DEFAULT_ICON,
			"It only takes one drink.", DEFAULT_ICON,
			"Loose lips sink ships.", DEFAULT_ICON,
			"Think twice, Tweet none times.  None more tweets.", DEFAULT_ICON,
			`It is after ${moment().format('h a')}. Do you know where your children are?`, DEFAULT_ICON,
			`${moment().format('h:mm a')} is not Miller Time`,  DEFAULT_ICON
		];

		const index = 10;//Math.floor(Math.random() * WELCOMONING.length / 2) * 2;
		this.state = {
			message: WELCOMONING[index],
			icon: WELCOMONING[index+1]
		};
		
		this.loginHandler = this.loginHandler.bind(this);
	}

	// Lifecycle
	render() {
		return (
			<div>
				<section className="slds-modal slds-fade-in-open slds-modal_prompt">
					<div className="slds-modal__container">
						<header className="menu slds-modal__header slds-p-around_xxx-small">.</header>
						<div onClick={this.loginHandler}
							 className="slds-text-link_reset menu slds-media slds-media_center slds-media_large slds-modal__content slds-p-around_medium">
							<div className="slds-media__figure">
								<img src={this.state.icon} alt="Login required" width={120}
									 onClick={this.loginHandler} style={{cursor: "pointer"}}/>
							</div>
							<div className="slds-media__body slds-text-color--inverse">
								<h2 className="slds-text-heading_large">{this.state.message}</h2>
								<div className="slds-text-heading_medium">Click to authenticate through your LMA org.</div>
							</div>
						</div>
						<footer className="menu slds-modal__footer slds-p-around_xxx-small">.</footer>
					</div>
				</section>
				<div className="slds-backdrop slds-backdrop_open"/>
			</div>
		);
	}
	
	// Handlers
	loginHandler() {
		const params = this.props.location ? qs.parse(this.props.location.search): {};
		authService.oauthLoginURL(params.r).then(url => {
			window.location.href = url;
		});
	}
}
