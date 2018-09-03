import * as h from './h';

const jsep = require('jsep');
jsep.addUnaryOp("?");

const PREFIX = "__filtrage";
const SEL_PREFIX = PREFIX + "__sel";
const URL = "/api/filters";

const Types = {
	Compound: "Compound",
	Identifier: "Identifier",
	MemberExpression: "MemberExpression",
	Literal: "Literal",
	ThisExpression: "ThisExpression",
	CallExpression: "CallExpression",
	UnaryExpression: "UnaryExpression",
	BinaryExpression: "BinaryExpression",
	LogicalExpression: "LogicalExpression",
	ConditionalExpression: "ConditionalExpression",
	ArrayExpression: "ArrayExpression"
};

export const requestFilters = (key) => h.get(URL, {key});

export const requestSaveFilter = (key, name, id) => {
	return h.put(URL, {id, key, name, query: getFilterColumns(key)});
};

export const requestDeleteFilter = (key, id) => {
	const selectedId = getSelectedFilterId(key);
	if (selectedId === id) {
		setSelectedFilterId(key, null);
	}
	return h.del(`${URL}/${id}`);
};

export const getFilterColumns = (key) => {
	if (!key) {
		return null;
	}

	const str = window.localStorage.getItem(PREFIX + key);
	return str ? JSON.parse(str) : [];
};

const setFilterColumns = (key, filters) => {
	if (!key) {
		return;
	}

	if (filters) {
		window.localStorage.setItem(PREFIX + key, JSON.stringify(filters));
	}
};

export const getSelectedFilterId = (key) => {
	if (!key) {
		return null;
	}

	const str = window.localStorage.getItem(SEL_PREFIX + key);
	return str ? parseInt(str, 10) : null;
};

export const setSelectedFilterId = (key, id) => {
	if (!key) {
		return;
	}
	if (id == null)
		window.localStorage.removeItem(SEL_PREFIX + key);
	else 
		window.localStorage.setItem(SEL_PREFIX + key, id);
};

export const sanitize = (filters) => {
	let sanitizedFilters = null;
	if (filters) {
		try { 
			sanitizedFilters = filters.map(f => {return {id: f.id, value: sanitizeValue(f.value)}});
		} catch (e) {
			// Bad filters, just ignore and don't change a thing.
			console.log("Bad filters: " + JSON.stringify(filters));
			return null;		
		}
	}
	return sanitizedFilters;
};

/**
 * Attempt to sanitize the filter value if possible, by wrapping it, so it can be unwrapped later when filtering.
 * Workaround for the jsep library not liking literal strings with numbers followed by non-numbers
 */
function sanitizeValue(value) {
	let sanitizedValue = value;
	try {
		jsep(sanitizedValue);
	} catch (e1) {
		const wrapped = `'${sanitizedValue}'`;
		jsep(wrapped);
		sanitizedValue = wrapped;
	}
	return sanitizedValue;
}

export const hasChanged = (newFilters, key) => {
	const storedJson = window.localStorage.getItem(PREFIX + key);
	return hasChangedFrom(storedJson, newFilters);
};

export const hasChangedFrom = (oldFilters, newFilters) => {
	const oldJson = typeof oldFilters !== "string" ? JSON.stringify(oldFilters) : oldFilters;
	const newJson = typeof newFilters !== "string" ? JSON.stringify(newFilters) : newFilters;
	return oldJson !== newJson;
};

export const filterRows = (filters, rows, key) => {
	try {
		let filteredRows = rows;
		if (filters && filters.length > 0 ) {
			let filterNodes = filters.map(f => ({id: f.id, node: jsep(sanitizeValue(f.value))}));
			filteredRows = rows.filter(row => {
				return !filterNodes.some(f => {
					let fieldElem = row[f.id];
					let fieldVal = (fieldElem == null || typeof fieldElem !== 'object') ? fieldElem : fieldElem.props.children.join("");
					fieldVal = fieldVal ? fieldVal.toLowerCase ? fieldVal.toLowerCase() : String(fieldVal) : null;

					return !matchNode(fieldVal, f, f.node);
				});
			});
		}
		setFilterColumns(key, filters);
		return filteredRows;
	} catch (e) {
		console.error(e);
		return rows;
	}
};

function matchNode(value, filter, node, neg) {
	switch (node.type) {
		case Types.Compound:
			return node.body.filter(n => matchNode(value, filter, n)).length > 0;
		case Types.Identifier:
			return matchFilterString(value, filter, node, neg);
		case Types.MemberExpression:
			break;
		case Types.Literal:
			let nodeValue = node.value && node.value.toLowerCase ? node.value.toLowerCase() : node.value;
			return isQuoted(node.raw) ?
				(String(nodeValue) === value) === !neg :
				 matchFilterString(value, filter, node, neg);
			
		case Types.ThisExpression:
			break;
		case Types.CallExpression:
			break;
		case Types.UnaryExpression:
			// Special unary handling of IS NULL: !? (Not Something) and IS NOT NULL: ? (Something) or !! (Not Nothing)
			switch(node.operator) {
				case "!":
					if (node.argument.type === Types.UnaryExpression && node.argument.operator === "?")  {
						// Operator is actually !? (Not Something)
						return value == null || value === "";
					} else if (!node.argument) {
						// Possible if there is nothing of meaning after the unary op.  Just ignore filter
						return true;
					} else {
						return matchNode(value, filter, node.argument, true);
					}
				case "?":
					// Operator is ? (Something)
					return value != null && value !== "";
				default:
					return false;
			}
		case Types.BinaryExpression:
			const sortVal = unwrap(filter, node.right).sortVal;
			switch(node.operator) {
				case "<":
					return value && value < sortVal;
				case ">":
					return value && value > sortVal;
				case "<=":
					return value && value <= sortVal;
				case ">=":
					return value && value >= sortVal;
				default:
					return false;
			}
		case Types.LogicalExpression:
			if (node.operator === "||") {
				return matchNode(value, filter, node.left) || matchNode(value, filter, node.right);
			} else {
				return matchNode(value, filter, node.left) && matchNode(value, filter, node.right);
			}
		case Types.ConditionalExpression:
			break;
		case Types.ArrayExpression:
			break;
		default:
			break;

	}
}

function matchFilterString(fieldVal, filter, node, neg) {
	const filterVal = unwrap(filter, node).filterVal;
	const first = filterVal.charAt(0);
	const last = filterVal.charAt(filterVal.length-1);
	if (first === "$") {
		return (fieldVal != null && fieldVal.startsWith(filterVal.substring(1))) === !neg;
	}
	if (last === "$") {
		return (fieldVal != null && fieldVal.endsWith(filterVal.substring(0, filterVal.length - 1))) === !neg;
	}
	// Else, full monty
	return (fieldVal != null && fieldVal.indexOf(filterVal) !== -1) === !neg;

}

function isQuoted(str) {
	const first = str.charAt(0);
	const last = str.charAt(str.length - 1);
	return (first === '"' && last === '"');
}

/**
 * We treat single-quotes as a sort of escape character, allowing for strings that would otherwise fail, like
 * numbers followed by non-numbers.
 */
function unwrap(filter, node) {
	if (!node.filterVal) {
		let fieldVal = "";
		switch (node.type) {
			case "Literal":
				fieldVal = node.name || String(node.raw) || "";
				break;
			case "BinaryExpression":
				fieldVal = unwrap(filter, node.left).filterVal + node.operator + unwrap(filter, node.right).filterVal;
				break;
			case "UnaryExpression":
				fieldVal = "";
				break;
			default:
				fieldVal = node.name || String(node.raw) || "";
				break;
		}

		let filterVal = isWrapped(fieldVal) ? fieldVal.substring(1, fieldVal.length - 1) : fieldVal;
		node.filterVal = filterVal.toLowerCase();
		node.sortVal = filter.id.indexOf("version_sort") !== -1 ? toVersionSort(fieldVal) : node.filterVal;
	}
	
	return node;
}

function toVersionSort(versionNumber) {
	let segments = versionNumber.split(".");
	while (segments.length < 3) {
		segments.push("0");
	}
	let paddedNumbers = segments.map(n => {
		let s = n;
		while (s.length < 4) {
			s = "0" + s;
		}
		return s;
	});
	return paddedNumbers.join("");
}

function isWrapped(str) {
	const first = str.charAt(0);
	const last = str.charAt(str.length - 1);
	return (first === "'" && last === "'");
}