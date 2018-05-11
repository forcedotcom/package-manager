import React from 'react';
import * as authService from "../services/AuthService";

export default class extends React.Component {
    constructor(props) {
        super(props);
        sessionStorage.removeItem('user');
    }

    loginHandler = () => {
        authService.oauthLoginURL("/orgs").then(url => {
            window.open(url, '', 'width=700,height=700,left=200,top=200');
        });
    };
    
    render() {
        return (
            <div>
                <section className="slds-modal slds-fade-in-open slds-modal_prompt">
                    <div className="slds-modal__container">
                        <header className="slds-modal__header">
                        </header>
                        <div className="slds-text-align--center slds-modal__content slds-p-around_medium">
                            <img src="/assets/images/panda.png" alt="Login required" onClick={this.loginHandler} style={{cursor: "pointer"}}/>
                            <h2 className="slds-m-top--medium slds-text-heading_small slds-hyphenate">(Authentication with SB62 Required)</h2>
                        </div>       
                    </div>
                </section>
                <div className="slds-backdrop slds-backdrop_open"/>
            </div>
        );
    }
}