import React from 'react';
import * as authService from "../services/AuthService";

export default React.createClass({
    getInitialState() {
        return { url: "" };
    },

    componentDidMount() {
        authService.oauthOrgURL().then(url => this.setState({url}));
    },

    render() {
        return (
            <a href={this.state.url}>Connect Org</a>
        );
    }
});