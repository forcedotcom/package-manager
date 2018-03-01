import React from 'react';

export default React.createClass({

    getInitialState() {
        let orggroup = this.props.orggroup;
        return {...orggroup};
    },

    changeName(event) {
        this.setState({name: event.target.value});
    },

    changeDescription(event) {
        this.setState({description: event.target.value});
    },

    onSave() {
        this.props.onSave(this.state);
    },

    render() {
        return (
            <div>
                <div aria-hidden="false" role="dialog" className="slds-modal slds-fade-in-open">
                    <div className="slds-modal__container">
                        <div className="slds-modal__header">
                            <h2 className="slds-text-heading--medium">New Group</h2>
                            <button className="slds-button slds-modal__close">
                                <svg aria-hidden="true" className="slds-button__icon slds-button__icon--inverse slds-button__icon--large">
                                </svg>
                                <span className="slds-assistive-text">Close</span>
                            </button>
                        </div>
                        <div className="slds-modal__content slds-p-around_medium">

                            <div className="slds-form--stacked">
                                <div className="slds-form-element">
                                    <label className="slds-form-element__label" htmlFor="name">Name</label>
                                    <div className="slds-form-element__control">
                                        <input className="slds-input" type="text" id="name" onChange={this.changeName}/>
                                    </div>
                                </div>
                                <div className="slds-form-element">
                                    <label className="slds-form-element__label" htmlFor="description">Description</label>
                                    <div className="slds-form-element__control">
                                        <input className="slds-input" type="text" id="description" onChange={this.changeDescription}/>
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div className="slds-modal__footer">
                            <button className="slds-button slds-button--neutral" onClick={this.props.onCancel}>Cancel</button>
                            <button className="slds-button slds-button--neutral slds-button--brand" onClick={this.onSave}>Save</button>
                        </div>
                    </div>
                </div>
                <div className="slds-modal-backdrop slds-modal-backdrop--open"></div>
            </div>
        );
    }
});