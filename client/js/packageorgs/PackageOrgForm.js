import React from 'react';
import LinkedStateMixin from 'react-addons-linked-state-mixin';

export default React.createClass({

    mixins: [LinkedStateMixin],

    getInitialState() {
        let packageorg = this.props.packageorg;
        return {...packageorg};
    },

    componentWillReceiveProps(props) {
        let packageorg = props.packageorg;
        this.setState({...packageorg});
    },

    save() {
        this.props.saveHandler(this.state);
    },

    render() {
        return (
            <div className="slds-form--stacked slds-grid slds-wrap slds-m-top--large">
                <div className="slds-col--padded slds-size--1-of-1 slds-medium-size--1-of-2">
                    <div className="slds-form-element">
                        <label className="slds-form-element__label" htmlFor="name">Name</label>
                        <div className="slds-form-element__control">
                            <input className="slds-input" type="text" valueLink={this.linkState('name')}/>
                        </div>
                    </div>
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
                    <div className="slds-col--padded slds-m-top--medium slds-size--1-of-1">
                        <button className="slds-button slds-button--brand" onClick={this.save}>Save</button>
                    </div>
                </div>
            </div>
        );
    }

});