import React from 'react';

import * as packageService from '../services/PackageService';
import * as sortage from '../services/sortage';

import {HomeHeader} from '../components/PageHeader';
import PackageList from './PackageList';

export default class extends React.Component {
    SORTAGE_KEY = "PackageList";

    state = {sortOrder: sortage.getSortOrder(this.SORTAGE_KEY, "name", "asc"), packages: [], itemCount: "..."};

    componentDidMount() {
        packageService.requestAll(this.state.sortOrder).then(packages=> this.setState({packages, itemCount: packages.length}));
    }

    filterHandler = (filtered) => {
        this.setState({itemCount: filtered.length});
    };

    render() {
        return (
            <div>
                <HomeHeader type="packages"
                            title="Packages"
                            itemCount={this.state.itemCount}/>
                <PackageList packages={this.state.packages} onFilter={this.filterHandler}/>
            </div>
        );
    }
}