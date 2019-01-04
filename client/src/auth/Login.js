import React from 'react';
import * as authService from "../services/AuthService";
import moment from "moment";

export default class extends React.Component {
	constructor(props) {
		super(props);
		sessionStorage.removeItem('user');

		let goodDay = () => {
			const hour = parseFloat(moment().format("HH"));
			return "good " + hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
		};

		const WELCOMONING = [
			"How many roads must a man walk down?",
			"Welcome to the jungle.",
			"Get that corn outta my face!",
			`${goodDay()}, Dave.`,
			"'All you need is love' - the Beatles.",
			"'All you need is food and shelter' - the Beetles.",
			"Winter is coming.",
			"What is the sound of someone trying to gargle while fighting off a pack of wolves?",
			"Welcome to the machine.",
			"Do not make me regret this.",
			"Look both ways before crossing.",
			"Mind the gap.",
			"It only takes one drink.",
			"Loose lips sink ships.",
			"Think twice, Tweet none times.  None more tweets.",
			`It is after ${moment().format('h a')}. Do you know where your children are?`,
			`${moment().format('h:mm a')} is not Miller Time`
		];

		this.state = {
			message: WELCOMONING[Math.floor(Math.random() * WELCOMONING.length)]
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
								<img src={`/assets/icons/standard/process_120.png`} alt="Login required"
									 onClick={this.loginHandler} style={{cursor: "pointer"}}/>
							</div>
							<div className="slds-media__body slds-text-color--inverse">
								<h2 className="slds-text-heading_large">{this.state.message}</h2>
								<div className="slds-text-heading_medium">Click to authenticate through SB62.</div>
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
		authService.oauthLoginURL().then(url => {
			window.location.href = url;
		});
	}
}
