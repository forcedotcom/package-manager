import React from 'react';

export default class extends React.Component {
	render() {
		let pct = `${Math.floor(this.props.progress * 100)}%`;
		let classNames = ["slds-progress-bar__value"];
		switch(this.props.status) {
			case "success":
				if (this.props.progress === 1)
					classNames.push("slds-progress-bar__value_success");
				break;
			case "error":
				classNames.push("slds-theme--error");
				break;
			case "canceled":
				classNames.push("slds-theme--warning");
				break;
			default:
		}
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
					<span className={classNames.join(" ")} style={{width: pct}}/>
				</div>
			</div>
		);
	}
}
