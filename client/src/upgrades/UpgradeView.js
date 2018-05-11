import React from 'react';

import UpgradeItemCard from '../upgrades/UpgradeItemCard';

export default class extends React.Component {
    render() {
        return (
            <div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
                <UpgradeItemCard upgrade={this.props.upgrade} items={this.props.items} status={this.props.status} onSort={this.props.onSort}/>
            </div>
        );
    }
}