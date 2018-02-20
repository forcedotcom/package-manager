import React from 'react';
import LinkedStateMixin from 'react-addons-linked-state-mixin';

export default React.createClass({

    mixins: [LinkedStateMixin],

    getInitialState() {
        let packageorg = this.props.packageorg;
        return {...packageorg};
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
                            <h2 className="slds-text-heading--medium">Add Package Org</h2>
                            <button className="slds-button slds-modal__close">
                                <svg aria-hidden="true" className="slds-button__icon slds-button__icon--inverse slds-button__icon--large">
                                </svg>
                                <span className="slds-assistive-text">Close</span>
                            </button>
                        </div>
                        <div className="slds-modal__content">

                            <div className="slds-form--stacked">
                                <div className="slds-form-element">
                                    <label className="slds-form-element__label" htmlFor="name">Name</label>
                                    <div className="slds-form-element__control">
                                        <input className="slds-input" type="text" valueLink={this.linkState('name')}/>
                                    </div>
                                </div>
                                <div className="slds-form-element">
                                    <label className="slds-form-element__label" htmlFor="username">Username</label>
                                    <div className="slds-form-element__control">
                                        <input className="slds-input" type="text" valueLink={this.linkState('username')}/>
                                    </div>
                                </div>
                                <div className="slds-form-element">
                                    <label className="slds-form-element__label" htmlFor="org_id">Org ID</label>
                                    <div className="slds-form-element__control">
                                        <input className="slds-input" type="text" valueLink={this.linkState('org_id')}/>
                                    </div>
                                </div>
                                <div className="slds-form-element">
                                    <label className="slds-form-element__label" htmlFor="namespace">Namespace</label>
                                    <div className="slds-form-element__control">
                                        <input className="slds-input" type="text" valueLink={this.linkState('namespace')}/>
                                    </div>
                                </div>
                                <div className="slds-form-element">
                                    <label className="slds-form-element__label" htmlFor="instance_url">Instance URL</label>
                                    <div className="slds-form-element__control">
                                        <input className="slds-input" type="text" valueLink={this.linkState('instance_url')}/>
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
                <div className="slds-modal-backdrop slds-modal-backdrop--open"/>
            </div>
        );
    }
});