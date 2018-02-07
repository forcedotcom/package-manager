import React from 'react';

import * as packageService from '../services/PackageService';

import {HomeHeader} from '../components/PageHeader';
import PackageList from './PackageList';

export default React.createClass({

    getInitialState() {
        return {view: "grid", sortOrder: "name", packages: []};
    },

    componentDidMount() {
        packageService.findAll(this.state.sortOrder).then(packages=> this.setState({packages}));
    },

    sortHandler(sortOrder) {
        packageService.findAll(sortOrder).then(packages => {
            this.setState({sortOrder, packages})
        });
    },

    viewChangeHandler(value) {
        this.setState({view: value});
    },

    render() {
        return (
            <div>
                <HomeHeader type="packages"
                            title="Packages"
                            actions={[]}
                            itemCount={this.state.packages.length}
                            viewOptions={[{value:"table", label:"Table", icon:"table"},{value:"tiles", label:"Tiles", icon:"location"}]}
                            sortOptions={[{value:"name", label:"Name"}]}
                            onSort={this.sortHandler}
                            onViewChange={this.viewChangeHandler}/>
                <PackageList packages={this.state.packages} onSort={this.sortHandler}/>
            </div>
        );
    }
});