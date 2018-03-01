import React from 'react';
import * as licenseService from "../services/LicenseService";
import LicenseCard from "../licenses/LicenseCard";

export default React.createClass({

    getInitialState() {
        return {};
    },

    componentWillReceiveProps(props) {
    },

    render() {
        return (
            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top">
                <div className="slds-col--padded slds-size--1-of-1">
                    <div className="slds-grid slds-wrap slds-m-top--large">
                        <div className="slds-col--padded slds-size--1-of-1">
                            <br/>
                            <LicenseCard licenses={this.props.licenses}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

});