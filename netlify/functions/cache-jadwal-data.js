const https = require('https');
const { getStore } = require('@netlify/blobs');

const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';
const CACHE_KEY = 'jadwal-dokter-cache';

/**
 * Fungsi fetch data dengan handle redirect
 */
function fetchData(url, redirectCount = 0) {
    if (redirectCount > 5) {
        return Promise.reject(new Error('Terlalu banyak pengalihan (redirect).'));
    }
    
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            // Handle redirect
            if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
                const redirectUrl = new URL(res.headers.location, url).href;
                console.log(`Redirect ke: ${redirectUrl}`);
                return resolve(fetchData(redirectUrl, redirectCount + 1));
            }
            
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP status code ${res.statusCode}`));
            }
            
            let body = '';
            res.on('data', (chunk) => { 
                body += chunk; 
            });
            
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Gagal mem-parsing respons JSON.'));
                }
            });
        });
        
        req.on('error', (err) => reject(err));
        
        // Timeout
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout setelah 30 detik'));
        });
    });
}

/**
 * Mendapatkan store untuk Netlify Blobs
 */
function getJadwalStore() {
    try {
        return getStore('jadwal-dokter');
    } catch (error) {
        console.log('Blobs store tidak tersedia:', error.message);
        return null;
    }
}

/**
 * Handler utama untuk caching data
 */
exports.handler = async (event, context) => {
    console.log('=== FUNGSI CACHE-JADWAL-DATA DIMULAI ===');
    
    try {
        console.log('🔄 Memulai proses caching data jadwal dokter...');
        
        // Fetch data dari Google Sheets
        const jadwalData = await fetchData(GOOGLE_SCRIPT_JADWAL_URL);
        
        if (!jadwalData || Object.keys(jadwalData).length === 0) {
            throw new Error('Data dari Google Sheets kosong atau tidak valid.');
        }
        
        console.log(`✅ Data diterima: ${Object.keys(jadwalData).length} spesialisasi`);
        
        // Simpan ke Netlify Blobs
        const jadwalStore = getJadwalStore();
        
        if (!jadwalStore) {
            throw new Error('Netlify Blobs store tidak tersedia. Periksa environment variables.');
        }
        
        await jadwalStore.setJSON(CACHE_KEY, jadwalData);
        
        console.log(`✅ Caching berhasil. ${Object.keys(jadwalData).length} data spesialisasi disimpan.`);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Data jadwal berhasil di-cache.',
                spesialisasi: Object.keys(jadwalData).length,
                timestamp: new Date().toISOString()
            }),
        };
        
    } catch (error) {
        console.error('❌ Gagal menjalankan fungsi cache:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: 'Gagal caching data',
                message: error.message,
                timestamp: new Date().toISOString()
            }),
        };
    }
};