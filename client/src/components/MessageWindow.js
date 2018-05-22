import React from 'react';

export default class extends React.Component {
    
    handleKeyDown = () => {
        this.props.onClose();
    };
    
    render() {
        return (
            <div onClick={this.props.onClose} tabIndex="0" onKeyDown={this.handleKeyDown}>
                <section className="slds-modal slds-fade-in-open slds-modal_prompt">
                    <div className="slds-modal__container">
                        <header className="slds-modal__header slds-theme_error slds-theme_alert-texture">
                            <button className="slds-button slds-button_icon slds-modal__close slds-button_icon-inverse"
                                    title="Close">
                                <svg className="slds-button__icon slds-button__icon_large">
                                    <use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#close"/>
                                </svg>
                                <span className="slds-assistive-text">Close</span>
                            </button>
                            <h2 className="slds-text-heading_medium" id="prompt-heading-id">{this.props.subject}</h2>
                        </header>
                        <div className="slds-modal__content slds-p-around_medium" id="prompt-message-wrapper">
                            <p>{this.props.message}</p>
                        </div>
                        <footer className="slds-modal__footer slds-theme_default">
                            <button autoFocus="true" className="slds-button slds-button_neutral" onClick={this.props.onClose}>Okay</button>
                        </footer>
                    </div>
                </section>
                <div className="slds-backdrop slds-backdrop_open"/>
            </div>
        );
    }
}