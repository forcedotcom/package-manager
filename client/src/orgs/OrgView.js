import React from 'react';
import InstalledVersionCard from "../packageversions/InstalledVersionCard";

export default class extends React.Component {
    state = {};

    componentWillReceiveProps(props) {
    }

    render() {
        return (
            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top--medium">
                <div className="slds-col--padded slds-size--1-of-1">
                    <InstalledVersionCard packageVersions={this.props.versions}/>
                </div>
            </div>
        );
    }
}