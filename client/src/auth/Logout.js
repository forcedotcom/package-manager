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

	render() {
		return (
			<Login/>
		);
	}
}