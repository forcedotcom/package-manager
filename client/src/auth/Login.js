import React from 'react';
import qs from 'query-string';

import * as authService from "../services/AuthService";
import moment from "moment";
import * as notifier from "../services/notifications";

const LOCK_ICON = `/assets/icons/evil/default.png`;
const HAL_ICON = `/assets/icons/evil/hal.png`;
const BEETLE_ICON = `/assets/icons/evil/beetle.png`;
const NACHO_ICON = `/assets/icons/evil/nacho.png`;
const LOVE_ICON = `/assets/icons/evil/love.png`;
const CLOCK_ICON = `/assets/icons/evil/clock.png`;
const WOLF_ICON = `/assets/icons/evil/wolf.png`;
const MACHINE_ICON = `/assets/icons/evil/machine.png`;
const DRANK_ICON = `/assets/icons/evil/drank.png`;
const JUNGLE_ICON = `/assets/icons/evil/jungle.png`;
const ROADS_ICON = `/assets/icons/evil/roads.png`;
const REGRET_ICON = `/assets/icons/evil/regret.png`;
const GAP_ICON = `/assets/icons/evil/gap.png`;
const SHIPS_ICON = `/assets/icons/evil/ships.png`;
const CROSSING_ICON = `/assets/icons/evil/crossing.png`;
const TRUMP_ICON = `/assets/icons/evil/trump.png`;

export default class extends React.Component {
	constructor(props) {
		super(props);
		authService.invalidateUser();

		let goodDay = () => {
			const hour = parseFloat(moment().format("HH"));
			return `Good ${hour < 5 ? "Night" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"}`;
		};

		const WELCOMONING = [
			"Site protected by padlock icon.", LOCK_ICON,
			"How many roads must a man walk down?", ROADS_ICON,
			"Welcome to the jungle.", JUNGLE_ICON,
			"Get that corn outta my face!", NACHO_ICON,
			`${goodDay()}, Dave.`, HAL_ICON,
			"'All you need is love' - the Beatles.", LOVE_ICON,
			"'All you need is dung' - the Beetles.", BEETLE_ICON,
			"Hear that? That is the sound of a man trying to gargle while fighting off a pack of wolves.", WOLF_ICON,
			"Welcome to the machine.", MACHINE_ICON,
			"Do not make me regret this.", REGRET_ICON,
			"Look both ways before crossing.", CROSSING_ICON,
			"Mind the gap.", GAP_ICON,
			"It only takes one drink.", DRANK_ICON,
			"Loose lips sink ships.", SHIPS_ICON,
			"Think twice, Tweet none times.  None more tweets.", TRUMP_ICON,
			`It is after ${moment().format('h a')}. Do you know where your children are?`, CLOCK_ICON,
			`${moment().format('h:mm a')} is not Miller Time`,  CLOCK_ICON
		];

		const index = Math.floor(Math.random() * WELCOMONING.length / 2) * 2;


		this.state = {
			message: WELCOMONING[index],
			icon: WELCOMONING[index+1],
			admin_access_key: undefined,
			settings: {has_admin_access_key: false}
		};


		this.loginHandler = this.loginHandler.bind(this);
		this.keyHandler = this.keyHandler.bind(this);
		this.adminKeyChangeHandler = this.adminKeyChangeHandler.bind(this);
	}

	// Lifecycle
	componentDidMount() {
		authService.requestSettings().then(settings => {
			this.setState({settings});
		});
	}

	render() {
		return (
			<div>
				<section className="slds-modal slds-fade-in-open slds-modal_prompt">
					<div className="slds-modal__container">
						<header className="menu slds-modal__header slds-p-around_xxx-small">.</header>
						<div
							 className="slds-text-link_reset menu slds-media slds-media_center slds-media_large slds-modal__content slds-p-around_medium">
							<div className="slds-media__figure">
								<img src={this.state.icon} alt="Login required" width={120}
									 onClick={this.loginHandler} style={{cursor: "pointer"}}/>
							</div>
							<div className="slds-media__body slds-text-color--inverse">
								<h2 className="slds-text-heading_large"
									onClick={this.loginHandler}>{this.state.message}</h2>
								<div className="slds-text-heading_medium"
									 onClick={this.loginHandler}>Click to authenticate through your LMA org.
								</div>
								{this.state.settings.has_admin_access_key ?
								<div className="slds-text-heading_medium slds-m-top--x-large">
									<h3 className="slds-text-heading_small">Or enter admin access key</h3>
									<input type="text" className="slds-input slds-text-color--default" id="Admin access key"
											 value={this.state.admin_access_key} onChange={this.adminKeyChangeHandler} onKeyUp={this.keyHandler}/>
								</div> : ""}

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

	adminKeyChangeHandler(event) {
		this.setState({admin_access_key: event.target.value});
	}

	keyHandler(event) {
		switch(event.key) {
			case "Enter":
				this.adminAccessHandler();
				break;
			default:
				return;

		}
	}

	adminAccessHandler() {
		const params = this.props.location ? qs.parse(this.props.location.search): {};
		authService.requestAdminAccess(this.state.admin_access_key, params.r).then(url => {
			window.location.href = url;
		});
	}
}
