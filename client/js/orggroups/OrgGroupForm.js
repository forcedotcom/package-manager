import React from 'react';

export default React.createClass({

    getInitialState() {
        let orggroup = this.props.orggroup;
        return {...orggroup};
    },

    componentWillReceiveProps(props) {
        let orggroup = props.orggroup;
        this.setState({...orggroup});
    },

    changeName(event) {
        this.setState({name: event.target.value});
    },

    changeDescription(event) {
        this.setState({description: event.target.value});
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
                            <input className="slds-input" type="text" id="name" value={this.state.name} onChange={this.changeName}/>
                        </div>
                    </div>
                    <div className="slds-form-element">
                        <label className="slds-form-element__label" htmlFor="description">Description</label>
                        <div className="slds-form-element__control">
                            <input className="slds-input" type="text" id="description" value={this.state.description} onChange={this.changeDescription}/>
                        </div>
                    </div>
                </div>
                <div className="slds-col--padded slds-m-top--medium slds-size--1-of-1">
                    <button className="slds-button slds-button--brand" onClick={this.save}>Save</button>
                </div>
            </div>
        );
    }

});