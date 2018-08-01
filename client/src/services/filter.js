const jsep = require('jsep');
jsep.addUnaryOp("?");

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

export const executeFilterOnRow = (filter, row) => {
	try {
		let tree = jsep(filter.value);
		let fieldElem = row[filter.id];
		let fieldVal = (fieldElem == null || typeof fieldElem === 'string') ? fieldElem : fieldElem.props.children.join("");
		fieldVal = fieldVal ? fieldVal.toLowerCase() : null;

		return matchNode(fieldVal, tree);
	} catch (e) {
		return "";
	}
};

function matchNode(value, node, neg) {
	switch (node.type) {
		case Types.Compound:
			node.body.forEach(n => {
				const match = matchNode(value, n);
				if (match)
					return true;
			});
			return false;
		case Types.Identifier:
			return matchFilterString(value, node, neg);
		case Types.MemberExpression:
			break;
		case Types.Literal:
			let nodeValue = node.value && node.value.toLowerCase ? node.value.toLowerCase() : node.value;
			return isQuoted(node.raw) ?
				(String(nodeValue) === value) === !neg :
				 matchFilterString(value, node, neg);
			
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
						// Possible if there is nothing of meaning after the unary op
						return false;
					} else {
						return matchNode(value, node.argument, true);
					}
				case "?":
					// Operator is ? (Something)
					return value != null && value !== "";
				default:
					return false;
			}
		case Types.BinaryExpression:
			break;
		case Types.LogicalExpression:
			if (node.operator === "||") {
				return matchNode(value, node.left) || matchNode(value, node.right);
			} else {
				return matchNode(value, node.left) && matchNode(value, node.right);
			}
		case Types.ConditionalExpression:
			break;
		case Types.ArrayExpression:
			break;
		default:
			break;

	}
}

function matchFilterString(fieldVal, node, neg) {
	const nodeName = (node.name || node.raw || "").toLowerCase();
	const first = nodeName.charAt(0);
	const last = nodeName.charAt(nodeName.length-1);
	if (first === "$") {
		return fieldVal.startsWith(nodeName.substring(1)) === !neg;
	}
	if (last === "$") {
		return fieldVal.endsWith(nodeName.substring(0, nodeName.length-1)) === !neg;
	}
	// Else, full monty
	return (fieldVal.indexOf(nodeName) !== -1) === !neg;

}

function isQuoted(str) {
	const first = str.charAt(0);
	const last = str.charAt(str.length - 1);
	return (first === "'" && last === "'") || (first === '"' && last === '"');
}