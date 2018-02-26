import React from 'react';

import * as packageService from '../services/PackageService';

import {HomeHeader} from '../components/PageHeader';
import PackageList from './PackageList';

export default React.createClass({

    getInitialState() {
        return {sortOrder: "name", packages: []};
    },

    componentDidMount() {
        packageService.requestAll(this.state.sortOrder).then(packages=> this.setState({packages}));
    },

    sortHandler(sortOrder) {
        packageService.requestAll(sortOrder).then(packages => {
            this.setState({sortOrder, packages})
        });
    },

    render() {
        return (
            <div>
                <HomeHeader type="packages"
                            title="Packages"
                            actions={[]}
                            itemCount={this.state.packages.length}
                            viewOptions={[{value:"table", label:"Table", icon:"table"}]}
                            sortOptions={[{value:"name", label:"Name"}]}
                            onSort={this.sortHandler}/>
                <PackageList packages={this.state.packages} onSort={this.sortHandler}/>
            </div>
        );
    }
});