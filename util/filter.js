const jsep = require('jsep');
const logger = require('../util/logger').logger;

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

exports.parseSQLExpressions = (dict, filters) => {
	return filters.map(f => parseFilterAsSQL(dict, f));
};


function parseFilterAsSQL(dict, filter) {
	try { 
		let tree = jsep(filter.value);
		return resolveSQL(dict, filter.id, tree) || "";
	} catch (e) { 
		logger.warn(e);
		return "";
	}
}

function resolveSQL(dict, id, node, neg) {
	switch (node.type) {
		case Types.Compound:
			return `(${node.body.map(n => resolveSQL(dict,id,n)).filter(s => s).join(" OR ")})`;
		case Types.Identifier:
			const first = node.name.charAt(0);
			const last = node.name.charAt(node.name.length-1);
			if (first === "$") {
				return `${dict.get(id)} ${neg ? "NOT" : "" } ILIKE '${node.name.substring(1)}%'`;
			}
			if (last === "$") {
				return `${dict.get(id)} ${neg ? "NOT" : "" } ILIKE '%${node.name.substring(0, node.name.length-1)}'`;
			}
			// Else, full monty
			return `${dict.get(id)} ${neg ? "NOT" : "" } ILIKE '%${node.name}%'`;
		case Types.MemberExpression:
			throw "MemberExpression not supported";
		case Types.Literal:
			return `${dict.get(id)} ${neg ? "!=" : "=" } '${node.value}'`;
		case Types.ThisExpression:
			throw "ThisExpression not supported";
		case Types.CallExpression:
			throw "CallExpression not supported";
		case Types.UnaryExpression:
			// Special unary handling of IS NULL: !? (Not Something) and IS NOT NULL: ? (Something) 
			switch(node.operator) {
				case "!":
					if (node.argument.type === Types.UnaryExpression && node.argument.operator === "?") {
						// Operator is actually !? (Not Something)
						return `${dict.get(id)} IS NULL`;
					} else if (!node.argument) {
						// Possible if there is nothing of meaning after the unary op
						return null;
					} else {
						// Operator is just ! (Not)
						return resolveSQL(dict, id, node.argument, true);
					}
				case "?":
					// Operator is ? (Something)
					return `${dict.get(id)} IS NOT NULL`;
				default:
					return null;
			}
		case Types.BinaryExpression:
			throw "BinaryExpression not supported";
		case Types.LogicalExpression:
			const op = node.operator === "||" ? "OR" : "AND";
			const left = resolveSQL(dict,id,node.left);
			const right = resolveSQL(dict,id,node.right);
			return !left ? right : !right ? left : `(${left} ${op} ${right})`;
		case Types.ConditionalExpression:
			throw "ConditionalExpression not supported";
		case Types.ArrayExpression:
			throw "ArrayExpression not supported";
		default:
			throw `Unknown expression ${node.type}`;
	}
}