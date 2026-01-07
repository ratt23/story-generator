const { pool } = require('./lib/db.js');

exports.handler = async (event, context) => {
    try {
        const client = await pool.connect();
        const query = `
            SELECT l.start_date, l.end_date, d.name as doctor_name
            FROM leave_data l
            JOIN doctors d ON l.doctor_id = d.id
            WHERE l.end_date >= CURRENT_DATE
            ORDER BY l.end_date
        `;
        const result = await client.query(query);
        client.release();

        const formatDate = (dateObj) => {
            if (!dateObj) return null;
            const d = new Date(dateObj);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
        };

        const leaves = result.rows.map(row => ({
            NamaDokter: row.doctor_name,
            TanggalMulaiCuti: formatDate(row.start_date),
            TanggalSelesaiCuti: formatDate(row.end_date)
        }));

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(leaves)
        };
    } catch (error) {
        console.error('Error fetching leaves:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to fetch leaves', details: error.message })
        };
    }
};
