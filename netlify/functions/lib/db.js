const { Pool } = require('pg');

const connectionString = process.env.NEON_DATABASE_URL;

console.log('[DB] Connection string:', connectionString ? 'LOADED' : 'MISSING');
console.log('[DB] Full connection string:', connectionString);

if (!connectionString) {
    console.error("NEON_DATABASE_URL is missing!");
}

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = { pool };
