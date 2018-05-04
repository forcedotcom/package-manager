import React from 'react';
import ReactTooltip from 'react-tooltip';

import {HeaderIcon, Icon} from "./Icons";
import {ButtonDropdown, DropdownItem} from "./Dropdown";
import moment from "moment/moment";

export class HeaderField extends React.Component {
    render() {

        let value = this.props.value;

        if (this.props.format === "currency") {
            value = parseFloat(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        } else if (this.props.format === "date") {
            value = moment(value).format("ll");
        } else if (this.props.format === "datetime") {
            value = moment(value).format("lll");
        }


        return (
            <div className="slds-col--padded">
                <dl>
                    <dt>
                        <p className="slds-text-heading--label slds-truncate" title="{this.props.label}">{this.props.label}</p>
                    </dt>
                    <dd>
                        <p className="slds-text-body--regular slds-truncate" title={value}>{value}</p>
                    </dd>
                </dl>
            </div>
        );
    }
}

export class RecordHeader extends React.Component {
    static defaultProps = {
        icon: {name: "account", category: "standard"}
    };

    render() {
        let groups = [];
        let currentGroup = null;
        if (this.props.actions) {
            for (let i = 0; i < this.props.actions.length; i++) {
                const currentAction = this.props.actions[i];
                let btn = <button key={currentAction.label} disabled={currentAction.disabled} className="slds-button slds-button--neutral" onClick={currentAction.handler}>{currentAction.label}
                    {currentAction.detail ? <ReactTooltip id={currentAction.label} place="left" effect="solid" delayShow={900} type="info">
                                                {currentAction.detail}
                                            </ReactTooltip> : ''}
                    </button>;
                if (currentGroup == null || currentGroup.key !== currentAction.group) {
                    currentGroup = {key: currentAction.group, actions: [btn]};
                    groups.push(currentGroup);
                } else {
                    currentGroup.actions.push(btn);
                }
            }
        }
        let actionBar = [];
        for (let i = 0; i < groups.length; i++) {
            actionBar.push(<div key={i} className="slds-button-group" role="group">{groups[i].actions}</div>);
        }
        return (
            <div className="slds-page-header">
                <div className="slds-grid">
                    <div className="slds-col slds-has-flexi-truncate">
                        <div className="slds-media">
                            <div className="slds-media__figure">
                                <HeaderIcon name={this.props.icon.name} category={this.props.icon.category} size="large"/>
                            </div>
                            <div className="slds-media__body">
                                <p className="slds-text-heading--label">{this.props.type}</p>
                                <div className="slds-grid">
                                    <h1 className="slds-text-heading--medium slds-m-right--small slds-truncate slds-align-middle" title={this.props.title}>{this.props.title}</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="slds-col slds-no-flex slds-align-bottom">
                        {actionBar}
                    </div>
                </div>
                <div className="slds-grid slds-page-header__detail-row">
                    {this.props.children}
                </div>
            </div>
        );
    }
}

export class CardHeader extends React.Component {
    static defaultProps = {
        icon: {name: "account", category: "standard"}
    };

    render() {
        let groups = [];
        let currentGroup = null;
        if (this.props.actions) {
            for (let i = 0; i < this.props.actions.length; i++) {
                const currentAction = this.props.actions[i];
                let btn = <button key={currentAction.label} disabled={currentAction.disabled} className="slds-button slds-button--neutral" onClick={currentAction.handler}>{currentAction.label}
                    {currentAction.detail ? <ReactTooltip id={currentAction.label} place="left" effect="solid" delayShow={900} type="info">
                                                {currentAction.detail}
                                            </ReactTooltip> : ''}
                            </button>;
                if (currentGroup == null || currentGroup.key !== currentAction.group) {
                    currentGroup = {key: currentAction.group, actions: [btn]};
                    groups.push(currentGroup);
                } else {
                    currentGroup.actions.push(btn);
                }
            }
        }
        let actionBar = [];
        for (let i = 0; i < groups.length; i++) {
            actionBar.push(<div key={i} className="slds-button-group" role="group">{groups[i].actions}</div>);
        }
        return (
            <header className="slds-card__header slds-grid">
                <div className="slds-media slds-media--center slds-has-flexi-truncate">
                    <div className="slds-media__figure">
                        <HeaderIcon name={this.props.icon.name} category={this.props.icon.category} size="small"/>
                    </div>
                    <div className="slds-media__body">
                        <h3 className="slds-text-heading--small slds-truncate" title={this.props.title}>{this.props.title}</h3>
                        <p className="slds-text-body--small">{this.props.count} versions</p>
                    </div>
                </div>
                <div className="slds-col slds-no-flex slds-align-bottom">
                    {actionBar}
                </div>
            </header>
        );
    }
}

export class FormHeader extends React.Component {
    static defaultProps = {
        icon: "account"
    };

    render() {
        return (
            <div className="slds-page-header">
                <div className="slds-grid">
                    <div className="slds-col slds-has-flexi-truncate">
                        <div className="slds-media">
                            <div className="slds-media__figure">
                                <Icon name={this.props.icon} size="large"/>
                            </div>
                            <div className="slds-media__body">
                                <p className="slds-text-heading--label">{this.props.type}</p>
                                <div className="slds-grid">
                                    <h1 className="slds-text-heading--medium slds-m-right--small slds-truncate slds-align-middle" title={this.props.title}>{this.props.title}</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="slds-col slds-no-flex slds-align-bottom">
                        <div className="slds-button-group" role="group">
                            <button className="slds-button slds-button--neutral" onClick={this.props.onSave}>Save</button>
                            <button className="slds-button slds-button--neutral" onClick={this.props.onCancel}>Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export class HomeHeader extends React.Component {
    static defaultProps = {
        newLabel: "New",
        icon: {name: "account", category: "standard"}
    };

    render() {
        let viewItems = null;
        if (this.props.viewOptions) {
            let dropdown = this.props.viewOptions.map(item => <DropdownItem key={item.label} value={item.value} label={item.label} icon={item.icon}/>);
            viewItems = <ButtonDropdown header="Display as" iconMore={true} value={this.props.viewOptions[0].value} onChange={this.props.onViewChange}>{dropdown}</ButtonDropdown>
        }

        let sortItems = null;
        if (this.props.sortOptions) {
            let dropdown = this.props.sortOptions.map(item => <DropdownItem key={item.label} value={item.value} label={item.label}/>);
            sortItems = <ButtonDropdown header="Sort By" icon="sort" iconMore={true} onChange={this.props.onSort}>{dropdown}</ButtonDropdown>
        }

        let groups = [];
        let currentGroup = null;
        if (this.props.actions) {
            for (let i = 0; i < this.props.actions.length; i++) {
                const currentAction = this.props.actions[i];
                let btn = 
                    <button data-tip data-for={currentAction.label} key={currentAction.label} disabled={currentAction.disabled} 
                                      className="slds-button slds-button--neutral" onClick={currentAction.handler}>{currentAction.label}
                        {currentAction.detail ? <ReactTooltip id={currentAction.label} place="left" effect="solid" delayShow={900} type="info">
                                                    {currentAction.detail}
                                                </ReactTooltip> : ''}
                    </button>;
                if (currentGroup == null || currentGroup.key !== currentAction.group) {
                    currentGroup = {key: currentAction.group, actions: [btn]};
                    groups.push(currentGroup);
                } else {
                    currentGroup.actions.push(btn);
                }
            }
        }
        let actionBar = [];
        for (let i = 0; i < groups.length; i++) {
            actionBar.push(<div key={i} className="slds-button-group" role="group">{groups[i].actions}</div>);
        }

        return (
            <div className="slds-page-header">
                <div className="slds-grid">
                    <div className="slds-col slds-has-flexi-truncate">
                        <p className="slds-text-heading--label">{this.props.type}</p>
                        <div className="slds-grid">
                            <div className="slds-grid slds-type-focus slds-no-space">
                                <h1 className="slds-text-heading--medium slds-truncate" title={this.props.title}>{this.props.title}</h1>
                            </div>
                        </div>
                    </div>
                    <div className="slds-col slds-no-flex slds-align-bottom">
                        <div className="slds-grid">
                            <div className="slds-button-space-left">
                                {viewItems}
                            </div>
                            <div className="slds-button-space-left">
                                {sortItems}
                            </div>
                            <div className="slds-button-group slds-button-space-left" role="group">
                                {actionBar}
                            </div>
                        </div>
                    </div>
                </div>
                <p className="slds-text-body--small slds-m-top--x-small">{this.props.itemCount} {this.props.type.toLowerCase()}</p>
                {this.props.children ?  <div className="slds-grid slds-page-header__detail-row">{this.props.children}</div> : "" }
            </div>
        );
    }
}
