import React from 'react';

export default class extends React.Component {
	render() {
		let buffer = 0, threshold = .5;
		let progressSuccess = (this.props.progressSuccess || this.props.progress) * 100;
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
		return (
			<div style={{lineHeight: 0}}>
				{this.props.message ?
					<div className="slds-grid slds-grid_align-spread slds-p-bottom_small"
						 id="progress-bar-label-id-1">
						<span>{this.props.message}</span>
						<span aria-hidden="true">
                          <strong>{parseInt((progressSuccess + progressWarning + progressError)*100, 10)}% complete</strong>
                        </span>
					</div>
					: ""}
				<div className="slds-progress-bar" style={{display: "inline-flex"}}>
					<span className="slds-progress-bar__value slds-progress-bar__value_success" style={{width: pctSuccess}}/>
					<span className="slds-progress-bar__value slds-theme--warning" style={{width: pctWarning}}/>
					<span className="slds-progress-bar__value slds-theme--error" style={{width: pctError}}/>
				</div>
			</div>
		);
	}
}
