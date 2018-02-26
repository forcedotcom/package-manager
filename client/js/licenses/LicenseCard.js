import React from 'react';

import DataGrid from "../components/DataGrid";
import {Icon, ButtonIcon} from "../components/Icons";

export default React.createClass({

    getInitialState() {
        return {};
    },

    actionHandler(data, value, label) {
        alert("TBD");
    },

    render() {
        return (
            <div className="slds-card">
                <header className="slds-card__header slds-grid">
                    <div className="slds-media slds-media--center slds-has-flexi-truncate">
                        <div className="slds-media__figure">
                            <Icon name="groups" size="small"/>
                        </div>
                        <div className="slds-media__body">
                            <h3 className="slds-text-heading--small slds-truncate">Installed Package</h3>
                        </div>
                    </div>
                    <div className="slds-no-flex">
                        <div className="slds-button-group">
                            <button className="slds-button slds-button--icon-border-filled">
                                <ButtonIcon name="down"/>
                                <span className="slds-assistive-text">Show More</span>
                            </button>
                        </div>
                    </div>
                </header>

                <section className="slds-card__body">
                    <DataGrid data={this.props.licenses} onSort={this.props.onSort} onAction={this.actionHandler}>
                        <div header="Name" field="name" sortable={true}/>
                        <div header="Package" field="package_name" sortable={true}/>
                        <div header="Version Name" field="version_name" sortable={true}/>
                        <div header="Version Number" field="version_number" sortable={true}/>
                        <div header="Status" field="status" textAlign="center" sortable={true}/>
                        <div header="Install Date" field="install_date" sortable={true} format="date"/>
                    </DataGrid>
                </section>
            </div>
        );
    }

});