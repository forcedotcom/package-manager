import React from 'react';

import * as packageVersionService from '../services/PackageVersionService';

import DataGrid from "../components/DataGrid";
import {Icon, ButtonIcon} from "../components/Icons";

export default React.createClass({

    getInitialState() {
        return {packageVersions: []};
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
                            <h3 className="slds-text-heading--small slds-truncate">Package Versions</h3>
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
                    <DataGrid data={this.props.packageVersions} onSort={this.props.onSort} onAction={this.actionHandler}>
                        <div header="Name" field="name" sortable="true"/>
                        <div header="Version ID" field="version_id"/>
                        <div header="Version Number" sortable="true" field="version_number"/>
                        <div header="Release Date" sortable="true" field="release_date"/>
                        <div header="Status" sortable="true" field="status"/>
                    </DataGrid>
                </section>

                <footer className="slds-card__footer"><a href="#">View All</a></footer>
            </div>
        );
    }

});