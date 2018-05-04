import React from 'react';
import * as orgGroupService from "../services/OrgGroupService";
import {FormHeader} from "../components/PageHeader";
import {ORG_GROUP_ICON} from "../Constants";

export default class extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            name: "",
            description: "",
            orgIds: []
        };
    }
    
    componentDidMount() {
        orgGroupService.requestById(this.props.match.params.orgGroupId).then(orggroup => this.setState({...orggroup}));
    }

    saveHandler = () => {
        orgGroupService.requestUpdate(this.state).then(() => {
            window.location = `/orggroup/${this.props.match.params.orgGroupId}`;
        });
    };

    cancelHandler = () => {
        window.location = `/orggroup/${this.props.match.params.orgGroupId}`;
    };

    nameChangeHandler = (event) => {
        this.setState({name: event.target.value});
    };

    descChangeHandler = (event) => {
        this.setState({description: event.target.value});
    };

    orgsChangeHandler = (event) => {
        let vals = event.target.value.replace(/[ \t\r\n\f'"]/g, ",").split(",").map(v => v.substring(0,15));
        let orgIds = vals.filter(elem => elem !== "" && (elem.length === 15));
        this.setState({orgIds: orgIds});
    };

    render() {
        return (
            <div>
                <FormHeader type="Org Group" icon={ORG_GROUP_ICON} title={this.state.name} onSave={this.saveHandler} onCancel={this.cancelHandler}/>
                <div className="slds-form slds-form_stacked slds-wrap  slds-m-around--medium">
                    <div className="slds-form-element">
                        <label className="slds-form-element__label" htmlFor="name">Name</label>
                        <div className="slds-form-element__control">
                            <input className="slds-input" type="text" id="name" value={this.state.name} onChange={this.nameChangeHandler}/>
                        </div>
                    </div>
                    <div className="slds-form-element">
                        <label className="slds-form-element__label" htmlFor="description">Description</label>
                        <div className="slds-form-element__control">
                            <input className="slds-input" type="text" id="description" value={this.state.description} onChange={this.descChangeHandler}/>
                        </div>
                    </div>
                    <div className="slds-form-element">
                        <label className="slds-form-element__label" htmlFor="org_ids">Import Org Ids</label>
                        <div className="slds-form-element__control">
                            <textarea className="slds-textarea" placeholder="Comma, space or newline-delimited list of valid org ids" id="org_id_import" value={this.state.orgIds.join(", ")} rows="7" onChange={this.orgsChangeHandler}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
