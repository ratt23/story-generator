import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
    console.error("NEON_DATABASE_URL is missing!");
}

export const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false // Neon often needs this for SSL connections from serverless envs depending on CA setup
    }
});
