import React from 'react';

import DataGrid from "../components/DataGrid";
import {Icon, ButtonIcon} from "../components/Icons";

export default React.createClass({

    getInitialState() {
        return {};
    },

    render() {
        return (
            <article className="slds-card">
                <div className="slds-card__header slds-grid">
                    <header className="slds-media slds-media_center slds-has-flexi-truncate">
                        <div className="slds-media__figure">
                            <span className="slds-icon_container slds-icon-standard-shipment" title="Installed Packages">
                                <svg className="slds-icon slds-icon_small" aria-hidden="true">
                                    <use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="/assets/icons/standard-sprite/svg/symbols.svg#shipment"/>
                                </svg>
                            </span>
                        </div>
                        <div className="slds-media__body">
                            <h2>
                                <a href="javascript:void(0);" className="slds-card__header-link slds-truncate"
                                   title="">
                                    <span className="slds-text-heading_small">Installed Packages</span>
                                </a>
                            </h2>
                        </div>
                    </header>
                </div>
                <div className="slds-card__body">
                    <DataGrid data={this.props.licenses} onSort={this.props.onSort}>
                        <div header="Name" field="name" sortable={true}/>
                        <div header="Package" field="package_name" sortable={true}/>
                        <div header="Version Name" field="version_name" sortable={true}/>
                        <div header="Version Number" field="version_number" sortable={true}/>
                        <div header="Status" field="status" textAlign="center" sortable={true}/>
                        <div header="Install Date" field="install_date" sortable={true} format="date"/>
                    </DataGrid>
                </div>
                <footer className="slds-card__footer"></footer>
            </article>
        );
    }

});