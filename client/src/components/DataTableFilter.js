import React from 'react';

export const FilterComponent = ({filter, onChange}) => (
	<div><input
		type="text"
		style={{
			width: '100%',
		}}
		value={filter ? filter.value : ''}
		onChange={event => onChange(event.target.value)}/>
	</div>
);

/**
 * Supported Filters
 * (not) wildcard
 * (not) startswith
 * (not) endswith
 * (not) exact
 * or (|| and ,)
 * and
 * empty
 * not empty
 */
const HelpText = () => (
	<div>
		<div className="slds-grid">
			<div className="slds-col slds-size_6-of-12">
				<article className="slds-text-align_left slds-m-around--medium slds-tile">
					<h3 className="slds-tile__title slds-truncate">Text matching</h3>
					<div className="slds-tile__detail">
						<dl className="slds-list_horizontal slds-wrap">
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Contains:
							</dt>
							<dd className="slds-item_detail slds-truncate">Match any occurrence of a string
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Starts with:
							</dt>
							<dd className="slds-item_detail slds-truncate">Match rows that start with a string
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Ends with:
							</dt>
							<dd className="slds-item_detail slds-truncate">Match rows that end with a string
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Exact match:
							</dt>
							<dd className="slds-item_detail slds-truncate">Match rows that match a string
							</dd>
						</dl>
					</div>
				</article>
			</div>
			<div className="slds-col slds-size_6-of-12">
				<article className="slds-text-align_left slds-m-around--medium slds-tile">
					<h3 className="slds-tile__title slds-truncate">Or conditions</h3>
					<div className="slds-tile__detail">
						<dl className="slds-list_horizontal slds-wrap">
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">First Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for first label
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Second Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for second label
							</dd>
						</dl>
					</div>
				</article>
			</div>
		</div>
		<div className="slds-grid">
			<div className="slds-col slds-size_6-of-12">
				<article className="slds-text-align_left slds-m-around--medium slds-tile">
					<h3 className="slds-tile__title slds-truncate">Or conditions</h3>
					<div className="slds-tile__detail">
						<dl className="slds-list_horizontal slds-wrap">
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">First Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for first label
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Second Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for second label
							</dd>
						</dl>
					</div>
				</article>
			</div>
			<div className="slds-col slds-size_6-of-12">
				<article className="slds-text-align_left slds-m-around--medium slds-tile">
					<h3 className="slds-tile__title slds-truncate">Or conditions</h3>
					<div className="slds-tile__detail">
						<dl className="slds-list_horizontal slds-wrap">
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">First Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for first label
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Second Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for second label
							</dd>
						</dl>
					</div>
				</article>
			</div>
		</div><div className="slds-grid">
			<div className="slds-col slds-size_6-of-12">
				<article className="slds-text-align_left slds-m-around--medium slds-tile">
					<h3 className="slds-tile__title slds-truncate">Or conditions</h3>
					<div className="slds-tile__detail">
						<dl className="slds-list_horizontal slds-wrap">
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">First Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for first label
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Second Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for second label
							</dd>
						</dl>
					</div>
				</article>
			</div>
			<div className="slds-col slds-size_6-of-12">
				<article className="slds-text-align_left slds-m-around--medium slds-tile">
					<h3 className="slds-tile__title slds-truncate">Or conditions</h3>
					<div className="slds-tile__detail">
						<dl className="slds-list_horizontal slds-wrap">
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">First Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for first label
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Second Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for second label
							</dd>
						</dl>
					</div>
				</article>
			</div>
		</div><div className="slds-grid">
			<div className="slds-col slds-size_6-of-12">
				<article className="slds-text-align_left slds-m-around--medium slds-tile">
					<h3 className="slds-tile__title slds-truncate">Or conditions</h3>
					<div className="slds-tile__detail">
						<dl className="slds-list_horizontal slds-wrap">
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">First Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for first label
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Second Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for second label
							</dd>
						</dl>
					</div>
				</article>
			</div>
			<div className="slds-col slds-size_6-of-12">
				<article className="slds-text-align_left slds-m-around--medium slds-tile">
					<h3 className="slds-tile__title slds-truncate">Or conditions</h3>
					<div className="slds-tile__detail">
						<dl className="slds-list_horizontal slds-wrap">
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">First Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for first label
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Second Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for second label
							</dd>
						</dl>
					</div>
				</article>
			</div>
		</div><div className="slds-grid">
			<div className="slds-col slds-size_6-of-12">
				<article className="slds-text-align_left slds-m-around--medium slds-tile">
					<h3 className="slds-tile__title slds-truncate">Or conditions</h3>
					<div className="slds-tile__detail">
						<dl className="slds-list_horizontal slds-wrap">
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">First Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for first label
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Second Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for second label
							</dd>
						</dl>
					</div>
				</article>
			</div>
			<div className="slds-col slds-size_6-of-12">
				<article className="slds-text-align_left slds-m-around--medium slds-tile">
					<h3 className="slds-tile__title slds-truncate">Or conditions</h3>
					<div className="slds-tile__detail">
						<dl className="slds-list_horizontal slds-wrap">
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">First Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for first label
							</dd>
							<dt className="slds-item_label slds-text-color_inverse-weak slds-truncate">Second Label:
							</dt>
							<dd className="slds-item_detail slds-truncate">Description for second label
							</dd>
						</dl>
					</div>
				</article>
			</div>
		</div>
	</div>
);