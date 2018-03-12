import React from 'react';

import DataGrid from "../components/DataGrid";

export default React.createClass({

    getInitialState() {
        return {title: this.props.title || "Orgs"};
    },

    linkHandler(org) {
        window.location.hash = "#org/" + org.org_id;
    },

    render() {
        return (
            <article className="slds-card">
                <div className="slds-card__header slds-grid">
                    <header className="slds-media slds-media_center slds-has-flexi-truncate">
                        <div className="slds-media__figure">
                            <span className="slds-icon_container slds-icon-standard-account" title="Orgs">
                                <svg className="slds-icon slds-icon_small" aria-hidden="true">
                                    <use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="/assets/icons/standard-sprite/svg/symbols.svg#account"/>
                                </svg>
                            </span>
                        </div>
                        <div className="slds-media__body">
                            <h2>
                                <a href="javascript:void(0);" className="slds-card__header-link slds-truncate"
                                   title="">
                                    <span className="slds-text-heading_small">{this.state.title}</span>
                                </a>
                            </h2>
                        </div>
                    </header>
                </div>
                <div className="slds-card__body">
                    <DataGrid data={this.props.orgs} onSort={this.props.onSort}>
                        <div header="Account" field="account_name" sortable={true} onLink={this.linkHandler} />
                        <div header="Org ID" field="org_id" sortable={true} />
                        <div header="Instance" field="instance" sortable={true} />
                        <div header="Type" field="type" sortable={true} />
                        <div header="Status" field="status" sortable={true} />
                        <div header="AOV Band" field="aov_band" sortable={true} />
                    </DataGrid>
                </div>
                <footer className="slds-card__footer"></footer>
            </article>
        );
    }

});