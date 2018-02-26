module.exports = {
    databaseURL: process.env.STEELBRICK_URL || process.env.DATABASE_URL || "jdbc:postgresql://postgres:postgres@localhost:5432/postgres"
};