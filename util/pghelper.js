const { Pool } = require('pg');

const VERBOSE_SQL = process.env.VERBOSE && process.env.VERBOSE.indexOf('SQL') !== -1 ? "true" : null;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres"
});


/**
 * Utility function to execute a long init script against a Postgres database
 */
exports.init = (sql, cb) => {
    pool.query(sql, [], cb);
};

/**
 * Utility function to execute a SQL select query against a Postgres database
 */
exports.query = async (sql, values) => {
    if (VERBOSE_SQL) {
        console.log(sql, values || '');
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