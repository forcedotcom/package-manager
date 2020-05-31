import React from 'react';
import {NotificationManager} from 'react-notifications';
import {Colors} from "../Constants";


export default class extends React.Component {
    constructor(props) {
        super(props);

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.dontCloseHandler = this.dontCloseHandler.bind(this);
    }

    // Lifecycle
    render() {
        let stats;
        try {
            stats = JSON.parse(this.props.upgradeStats);
        } catch (e) {
            stats = this.props.upgradeStats;
        }
        let statsContent =
            <ol className="slds-has-dividers_top-space">{stats.map((m, i) => {
                return <li className="slds-item" key={`package-${i}`}>
                    <div className="slds-text-title_caps">{m.package}</div>
                    <div>{m.stats}</div>
                </li>;
            })}</ol>


        return (
            <div onClick={this.props.onClose} tabIndex="0" onKeyDown={this.handleKeyDown}>
                <section className="slds-modal slds-fade-in-open slds-modal_prompt">
                    <div onClick={this.dontCloseHandler} className="slds-modal__container">
                        <header className="slds-modal__header" style={{color: "white", backgroundColor: Colors.Success}}>
                            <button className="slds-button slds-button_icon slds-modal__close slds-button_icon-inverse"
                                    title="Close">
                                <svg className="slds-button__icon slds-button__icon_large">
                                    <use xmlnsXlink="http://www.w3.org/1999/xlink"
                                         xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#close"/>
                                </svg>
                                <span className="slds-assistive-text">Close</span>
                            </button>
                            <h2 className="slds-text-heading_medium" id="prompt-heading-id">{this.props.title}</h2>
                        </header>
                        <div className="slds-modal__content slds-p-around_medium" id="prompt-message-wrapper">
                            {statsContent}
                        </div>
                        <footer className="slds-modal__footer slds-theme_default">
                            <button autoFocus={true} className="slds-button slds-button_neutral"
                                    onClick={this.props.onClose}>Close
                            </button>
                        </footer>
                    </div>
                </section>
            </div>
        );
    }

    // Handlers
    handleKeyDown(e) {
        switch (e.key) {
            case "Escape":
                this.props.onClose();
                return false;
            default:
                return true;
        }
    }

    dontCloseHandler(e) {
        if (!e.target.type) {
            e.stopPropagation();
        }
    }
}