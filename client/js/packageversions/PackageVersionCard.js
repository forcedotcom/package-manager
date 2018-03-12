import React from 'react';

import DataGrid from "../components/DataGrid";
import {Icon, ButtonIcon} from "../components/Icons";

export default React.createClass({

    getInitialState() {
        return {packageVersions: []};
    },

    linkHandler(packageVersion) {
        window.location.hash = "#packageVersion/" + packageVersion.sfid;
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
                </header>

                <section className="slds-card__body">
                    <DataGrid data={this.props.packageVersions} onSort={this.props.onSort}>
                        <div header="Version ID" field="version_id" onLink={this.linkHandler}/>
                        <div header="Package" field="pcakage_name" sortable="true" />
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