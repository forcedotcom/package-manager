import React from 'react';

export default class extends React.Component {
	render() {
		let pct = `${Math.floor(this.props.progress * 100)}%`;
		return (
			<div>
				{this.props.message ?
					<div className="slds-grid slds-grid_align-spread slds-p-bottom_x-small"
						 id="progress-bar-label-id-1">
						<span>{this.props.message}</span>
						<span aria-hidden="true">
                          <strong>{pct} complete</strong>
                        </span>
					</div>
					: ""}
				<div className="slds-progress-bar">
					<span
						className={`slds-progress-bar__value ${this.props.success && this.props.progress === 1 ? "slds-progress-bar__value_success" :
							!this.props.success ? "slds-theme--error" : ""}`}
						style={{width: pct}}/>
				</div>
			</div>
		);
	}
}
