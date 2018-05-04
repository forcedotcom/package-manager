import React from 'react';

import UpgradeJobCard from '../upgrades/UpgradeJobCard';

export default class extends React.Component {
    render() {
        return (
            <div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
                <UpgradeJobCard jobs={this.props.jobs}/>
            </div>
        );
    }
}