import React from 'react';

export default class AuthorizeWindow extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div/>
        );
    }

    componentDidMount() {
        // STEP 3: open a new browser window and store a reference to it
        this.externalWindow = window.open(this.props.url, '', 'width=700,height=700,left=200,top=200');
    }

    componentWillUnmount() {
        this.externalWindow.close();
    }
}