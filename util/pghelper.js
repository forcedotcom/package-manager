const { Pool } = require('pg');

const VERBOSE_SQL = process.env.VERBOSE && process.env.VERBOSE.indexOf('SQL') !== -1;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres"
});

/**
 * Utility function to execute a SQL query against a Postgres database
 */
exports.query = async function (sql, values, singleItem) {
    if (VERBOSE_SQL) {
        console.log(sql, values);
    }

    let result = await pool.query(sql, values);
    return (singleItem ? result.rows[0] : result.rows);
};