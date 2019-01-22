import React from 'react';

export default class extends React.Component {
	render() {
		let progressSuccess = this.props.progressSuccess || this.props.progress;
		let progressWarning = this.props.progressWarning || 0;
		let progressError = this.props.progressError || 0;
		let pctSuccess = `${progressSuccess * 100}%`;
		let pctWarning = `${progressWarning * 100}%`;
		let pctError = `${progressError * 100}%`;
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
