import React from 'react';
import * as authService from "../services/AuthService";
import Login from "./Login";

export default class extends React.Component {
	state = {};

	componentDidMount() {
		authService.requestLogout().then(() => {
			console.log("Logged out!");
		});
	};

	// loginHandler = () => {
	//     authService.oauthLoginURL().then(url => {
	//         window.open(url, '', 'width=700,height=700,left=200,top=200');
	//     });
	// };

	render() {
		return (
			<Login/>
		);
	}
}