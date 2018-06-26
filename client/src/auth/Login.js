import React from 'react';
import * as authService from "../services/AuthService";

const WELCOMONING = [
	"Welcome to the machine.",
	"Do not make me regret this.",
	"Look both ways before crossing.",
	"Mind the gap.",
	"It only takes one drink.",
	"Do you know where your children are?",
];

export default class extends React.Component {
	constructor(props) {
		super(props);
		sessionStorage.removeItem('user');

		this.state = {
			message: WELCOMONING[Math.floor(Math.random() * WELCOMONING.length)]
		}
	}

	loginHandler = () => {
		authService.oauthLoginURL("/orgs").then(url => {
			window.open(url, '', 'width=700,height=700,left=200,top=200');
		});
	};

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
}