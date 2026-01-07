
import { pool } from './lib/db.js';

export const handler = async (event, context) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM doctors');
        client.release();

        const doctors = result.rows;
        const grouped = {};

        doctors.forEach(doc => {
            const specialty = doc.specialty || 'Ummum';
            // Simple slug for key
            const key = specialty.toLowerCase().replace(/[^a-z0-9]/g, '-');

            if (!grouped[key]) {
                grouped[key] = {
                    title: specialty,
                    doctors: []
                };
            }

            grouped[key].doctors.push({
                name: doc.name,
                image_url: doc.image_url
            });
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(grouped)
        };
    } catch (error) {
        console.error('Error fetching doctors:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to fetch doctors', details: error.message })
        };
    }
};
