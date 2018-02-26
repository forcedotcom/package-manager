import React from "react";
import {Icon} from "../components/Icons";

export default React.createClass({

    getDefaultProps() {
        return {
            icon: "account"
        }
    },

    render() {
        return (
            <div className="slds-page-header">
                <div className="slds-grid">
                    <div className="slds-col slds-has-flexi-truncate">
                        <div className="slds-media">
                            <div className="slds-media__figure">
                                <Icon name={this.props.icon} size="large"/>
                            </div>
                            <div className="slds-media__body">
                                <p className="slds-text-heading--label">{this.props.type}</p>
                                <div className="slds-grid">
                                    <h1 className="slds-text-heading--medium slds-m-right--small slds-truncate slds-align-middle" title={this.props.title}>{this.props.title}</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="slds-col slds-no-flex slds-align-bottom">
                        <div className="slds-button-group" role="group">
                            <button className="slds-button slds-button--neutral" onClick={this.props.onUpgrade}>Upgrade</button>
                        </div>
                    </div>
                </div>
                <div className="slds-grid slds-page-header__detail-row">
                    {this.props.children}
                </div>
            </div>
        );
    }

});
