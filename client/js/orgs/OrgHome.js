import React from 'react';

import * as orgService from '../services/OrgService';

import {HomeHeader} from '../components/PageHeader';

import OrgList from './OrgList';

export default React.createClass({

    getInitialState() {
        return {view: "grid", sortOrder: "id", orgs: []};
    },
    
    componentDidMount() {
        orgService.requestAll(this.state.sortOrder).then(orgs => {this.setState({orgs})});
    },

    sortHandler(sortOrder) {
        orgService.requestAll(sortOrder).then(orgs => {
            this.setState({sortOrder, orgs})
        });
    },

    cancelHandler() {
        this.setState({});
    },

    render() {
        let view = <OrgList orgs={this.state.orgs} onSort={this.sortHandler}/>;
        return (
            <div>
                <HomeHeader type="orgs"
                            title="Orgs"
                            actions={[]}
                            itemCount={this.state.orgs.length}
                            viewOptions={[{value:"table", label:"Table", icon:"table"}]}
                            sortOptions={[{value:"id", label:"Org ID"},{value:"account_name", label:"Account"},{value:"instance", label:"Instance"}]}
                            onSort={this.sortHandler}/>
                {view}
            </div>
        );
    }

});