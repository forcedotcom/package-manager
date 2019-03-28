import React from 'react';
import {Colors} from "../Constants";

export default class extends React.Component {
	render() {
		// If progressTotal is given, but is <= 0, there is nothing to show but the message, if any.
		let valid = typeof this.props.progressTotal === "undefined" || this.props.progressTotal > 0;
		if (!valid) {
			return (<div><span>{this.props.message}</span></div>);
		}

		const colorSuccess = this.props.colorSuccess || Colors.Success;
		const colorWarning = Colors.Warning;
		const colorError = Colors.Error;
		let buffer = 0, threshold = .5;

		let height = this.props.height || ".5em";

		let progressSuccess = (this.props.progressSuccess || this.props.progress || 0) * 100;
		let progressWarning = (this.props.progressWarning || 0) * 100;
		let progressError = (this.props.progressError || 0) * 100;

		if (progressSuccess > 0 && progressSuccess < threshold) {
			progressSuccess += threshold;
			buffer += threshold;
		}
		if (progressWarning > 0 && progressWarning < threshold) {
			progressWarning += threshold;
			buffer += threshold;
		}
		if (progressError > 0 && progressError < threshold) {
			progressError += threshold;
			buffer += threshold;
		}
		if (buffer > 0) {
			if (progressSuccess > 50)
				progressSuccess -= buffer;
			else if (progressWarning > 50)
				progressWarning -= buffer;
			else
				progressError -= buffer;
		}
		let pctSuccess = `${progressSuccess}%`;
		let pctWarning = `${progressWarning}%`;
		let pctError = `${progressError}%`;

		let progressComplete = progressSuccess + progressWarning + progressError;
		if (progressComplete + .000000001 > 100) {
			// Stupid but simple hack.  Better option is to refactor to pass actual counts, rather than percentages
			progressComplete = 100;
		}

		return (
			<div style={{lineHeight: this.props.message ? 1 : 0}}>
				{this.props.message ?
					<div className="slds-grid slds-grid_align-spread">
						<span>{this.props.message}</span>
						<span style={{paddingLeft: "5px"}}><strong>{parseInt(progressComplete, 10)}% complete</strong></span>
					</div>
					: ""}
				<div className="slds-progress-bar" style={{display: "inline-flex", height}}>
					<span className="slds-progress-bar__value" style={{backgroundColor: colorSuccess, width: pctSuccess}}/>
					<span className="slds-progress-bar__value" style={{backgroundColor: colorWarning, width: pctWarning}}/>
					<span className="slds-progress-bar__value" style={{backgroundColor: colorError, width: pctError}}/>
				</div>
			</div>
		);
	}
}
