import React from 'react';
import ReactTooltip from 'react-tooltip';

export const FilterComponent = ({filter, onChange}) => (
	<div><input data-tip=""
				type="text"
				style={{
					width: '100%',
				}}
				value={filter ? filter.value : ''}
				onChange={event => onChange(event.target.value)}/>
		<ReactTooltip getContent={HelpText} effect="solid" delayShow={900}/>

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
	<div className="slds-grid slds-wrap">
		<HelpSection title="Text expressions" items={[
			{example: 'some text', description: "contains some text"},
			{example: '$some text', description: "starts with some text"},
			{example: 'some text$', description: "ends with some text"},
			{example: '"some text"', description: "equals some text exactly"}
		]}/>
		<HelpSection title="Compound expressions" items={[
			{example: 'a || b', description: "match a or b"},
			{example: 'a, b, c', description: "match a, b, or c"},
			{example: 'a && b', description: "match AND b"},
		]}/>
		<HelpSection title="Not and Null expressions" items={[
			{example: '!a', description: "not a"},
			{example: '?', description: "contains any text (not empty)"},
			{example: '!?', description: "does not contain any text"},
		]}/>
	</div>
);

const HelpSection = ({title,items}) => {
	const helpItems = items.map(i => <HelpItem example={i.example} description={i.description}/>);
	return (
		<div className="slds-col slds-small-size_1-of-2">
			<article className="slds-text-align_left slds-m-around--medium slds-tile">
				<h2 className="slds-m-bottom--small slds-text-color_inverse-weak slds-text-title_caps">{title}</h2>
				<div className="slds-tile__detail">{helpItems}</div>
			</article>
		</div>
	);
};

const HelpItem = ({example, description}) => (
	<div className="slds-m-bottom--medium">
		<span className="slds-badge slds-text-align--center slds-size--xx-small slds-p-left--small slds-p-right--small"
			  style={{textTransform: "lowercase", fontSize: "1em"}}>{example}</span>
		<span className="slds-m-left--small slds-item_detail">=></span>
		<span className="slds-m-left--small slds-item_detail">{description}</span>
	</div>
);