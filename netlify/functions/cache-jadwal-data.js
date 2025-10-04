const https = require('https');
const { getStore } = require('@netlify/blobs');

const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';
const CACHE_KEY = 'jadwal-dokter-cache';

async function fetchData(url, redirectCount = 0) {
    if (redirectCount > 5) {
        throw new Error('Terlalu banyak pengalihan (redirect).');
    }
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return resolve(fetchData(res.headers.location, redirectCount + 1));
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP status code ${res.statusCode}`));
            }
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Gagal mem-parsing respons JSON.'));
                }
            });
        });
        req.on('error', (err) => reject(err));
    });
}

exports.handler = async () => {
    try {
        console.log('Memulai proses caching data jadwal dokter...');
        const jadwalData = await fetchData(GOOGLE_SCRIPT_JADWAL_URL);
        if (!jadwalData || Object.keys(jadwalData).length === 0) {
            throw new Error('Data dari Google Sheets kosong atau tidak valid.');
        }
        const jadwalStore = getStore('jadwal-dokter');
        await jadwalStore.setJSON(CACHE_KEY, jadwalData);
        console.log(`Caching berhasil. ${Object.keys(jadwalData).length} data spesialisasi disimpan.`);
        return {
            statusCode: 200,
            body: 'Data jadwal berhasil di-cache.',
        };
    } catch (error) {
        console.error('Gagal menjalankan fungsi cache:', error);
        return {
            statusCode: 500,
            body: `Error: ${error.message}`,
        };
    }
};

