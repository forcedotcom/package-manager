import React from 'react';
import {FormHeader, HeaderField} from "../components/PageHeader";
import {PACKAGE_ORG_ICON} from "../Constants";

export default class extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            org_id: props.packageorg.org_id,
            description: props.packageorg.description || ""
        };
    }
    
    saveHandler = () => {
        this.props.onSave(this.state);
    };

    descChangeHandler = (event) => {
        this.setState({description: event.target.value});
    };

    render() {
        return (
            <div>
                <div className="slds-modal slds-fade-in-open">
                    <div className="slds-modal__container">
                        <FormHeader type="Package Org" icon={PACKAGE_ORG_ICON} title={this.props.packageorg.name} 
                                    onSave={this.saveHandler} onCancel={this.props.onCancel}>
                            <HeaderField label="Instance URL" value={this.props.packageorg.instance_url}/>
                            <HeaderField label="Status" value={this.props.packageorg.status}/>
                        </FormHeader>
                        <div className="slds-modal__content slds-p-around_medium">

                            <div className="slds-form slds-form_stacked slds-wrap  slds-m-around--medium">
                                <div className="slds-form-element">
                                    <label className="slds-form-element__label" htmlFor="description">Description</label>
                                    <div className="slds-form-element__control">
                                        <textarea rows="3" className="slds-input" type="text" id="description" value={this.state.description} onChange={this.descChangeHandler}/>
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>
                <div className="slds-modal-backdrop slds-modal-backdrop--open"></div>
            </div>
        );
    }
}
