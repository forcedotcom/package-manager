import React, {Component} from 'react';
import {BrowserRouter as Router, Link, Route} from "react-router-dom";

import {Icon} from './components/Icons';

import AuthResponse from "./auth/AuthResponse";

class Console extends Component {
	render() {
		return (
			<Router>
				<div>
					<header className="menu">
						<ul className="slds-list--horizontal">
							<li className="slds-list__item">
								<Link onClick={window.close}><Icon name="close"/>Close</Link>
							</li>
						</ul>
					</header>

					<Route path="/authresponse" component={AuthResponse}/>
				</div>
			</Router>
		);
	}
}

export default Console;