const {Pool} = require('pg');
const logger = require('./logger').logger;

const pool = new Pool({
	connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres"
});

const MAX_SQL_DEBUG_LENGTH = 5000;
const DEBUG_SQL_VALUES = process.env.DEBUG_SQL_VALUES === "true";

/**
 * Utility function to execute a long init script against a Postgres database
 */
exports.init = (sql, cb) => {
	pool.query(sql, [], cb);
};

/**
 * Utility function to execute a SQL select query against a Postgres database
 */
exports.query = async (sql, values, skipDebug) => {
	if (!skipDebug) {
		if (sql.length > MAX_SQL_DEBUG_LENGTH) {
			logger.debug(sql.substring(0, MAX_SQL_DEBUG_LENGTH) + "..." + sql.substring(sql.length - 20));
		} else {
			logger.debug(sql, DEBUG_SQL_VALUES ? values : {});
		}
	}

	let result = await pool.query(sql, values);
	return result.rows;
};

/**
 * Utility function to execute a SQL select query to retrieve a single record from a Postgres database
 */
exports.retrieve = async (sql, values) => {
	let rows = await exports.query(sql, values);
	return rows[0];
};

/**
 * Utility function to execute a SQL insert query against a Postgres database
 */
exports.insert = async (sql, values) => {
	sql += ` RETURNING *`;
	return await exports.query(sql, values);
};

/**
 * Utility function to execute a SQL update query against a Postgres database
 */
exports.update = async (sql, values) => {
	sql += ` RETURNING *`;
	return await exports.query(sql, values);
};

/**
 * Utility function to execute a SQL delete query against a Postgres database
 */
exports.delete = exports.query;