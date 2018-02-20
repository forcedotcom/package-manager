import React from 'react';

export default class PortalWindow extends React.Component {
    constructor(props) {
        super(props);
        // STEP 1: create a container <div>
        this.containerEl = document.createElement('div');
        this.externalWindow = null;
    }

    render() {
        return (
            <div/>
        );
    }

    componentDidMount() {
        // STEP 3: open a new browser window and store a reference to it
        this.externalWindow = window.open(this.props.url, '', 'width=700,height=700,left=200,top=200');

        // STEP 4: append the container <div> (that has props.children appended to it) to the body of the new window
        // this.externalWindow.document.body.appendChild(this.containerEl);
    }

    componentWillUnmount() {
        // STEP 5: This will fire when this.state.showWindowPortal in the parent component becomes false
        // So we tidy up by closing the window
        this.externalWindow.close();
    }
}