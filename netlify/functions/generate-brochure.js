const fs = require('fs').promises;
const path = require('path');
const { getStore } = require('@netlify/blobs');
const https = require('https');

const CACHE_KEY = 'jadwal-dokter-cache';
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';

/**
 * Fungsi untuk fetch data dari URL dengan handle redirect dan timeout yang lebih robust
 */
function fetchData(url, redirectCount = 0) {
    if (redirectCount > 5) {
        return Promise.reject(new Error('Terlalu banyak pengalihan (redirect).'));
    }
    
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            // Handle semua jenis redirect
            if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
                const redirectUrl = new URL(res.headers.location, url).href;
                console.log(`Redirect ke: ${redirectUrl}`);
                return resolve(fetchData(redirectUrl, redirectCount + 1));
            }
            
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP status code ${res.statusCode} untuk ${url}`));
            }
            
            let body = '';
            res.on('data', (chunk) => { 
                body += chunk; 
            });
            
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(body);
                    resolve(parsedData);
                } catch (e) {
                    reject(new Error('Gagal mem-parsing respons JSON dari Google Sheets.'));
                }
            });
        });
        
        req.on('error', (err) => {
            reject(new Error(`Error koneksi: ${err.message}`));
        });
        
        // Timeout 30 detik
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout setelah 30 detik'));
        });
    });
}

/**
 * Mendapatkan store untuk Netlify Blobs dengan fallback konfigurasi
 */
function getJadwalStore() {
    try {
        // Coba dengan konfigurasi otomatis (untuk production Netlify)
        console.log('Mencoba konfigurasi Blobs otomatis...');
        return getStore('jadwal-dokter');
    } catch (error) {
        // Fallback ke konfigurasi manual
        console.log('Menggunakan konfigurasi manual untuk Blobs:', error.message);
        
        // Untuk environment development atau jika konfigurasi otomatis gagal
        const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
        const token = process.env.NETLIFY_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
        
        if (!siteID || !token) {
            console.warn('Environment variables untuk Blobs tidak ditemukan, menggunakan fallback langsung ke Google Sheets');
            return null;
        }
        
        return getStore({
            name: 'jadwal-dokter',
            siteID: siteID,
            token: token
        });
    }
}

/**
 * Mengambil data jadwal dari cache. Jika cache tidak ada, fallback ke Google Sheets langsung.
 */
async function getJadwalDataFromCache() {
    try {
        const jadwalStore = getJadwalStore();
        
        if (!jadwalStore) {
            console.log('Store tidak tersedia, mengambil data langsung dari Google Sheets...');
            return await getJadwalDataDirect();
        }
        
        console.log('Mencoba mengambil data dari cache...');
        const rawData = await jadwalStore.get(CACHE_KEY);
        
        if (!rawData) {
            console.log('Cache kosong, mengambil data langsung dari Google Sheets...');
            return await getJadwalDataDirect();
        }

        const parsedData = JSON.parse(rawData);
        console.log(`Berhasil mengambil data dari cache: ${Object.keys(parsedData).length} spesialisasi`);
        
        // Ubah format data agar sesuai dengan kebutuhan template
        return Object.values(parsedData).map(spec => ({
            title: spec.title,
            doctors: spec.doctors.map(doc => ({ 
                name: doc.name, 
                schedule: doc.schedule 
            })),
        }));
    } catch (error) {
        console.log('Error akses cache, fallback ke Google Sheets:', error.message);
        return await getJadwalDataDirect();
    }
}

/**
 * Fallback: Mengambil data langsung dari Google Sheets
 */
async function getJadwalDataDirect() {
    try {
        console.log('Mengambil data langsung dari Google Sheets...');
        const jadwalData = await fetchData(GOOGLE_SCRIPT_JADWAL_URL);
        
        if (!jadwalData || Object.keys(jadwalData).length === 0) {
            throw new Error('Data dari Google Sheets kosong atau tidak valid.');
        }
        
        console.log(`Berhasil mengambil data langsung: ${Object.keys(jadwalData).length} spesialisasi`);
        
        // Ubah format data agar sesuai dengan kebutuhan template
        return Object.values(jadwalData).map(spec => ({
            title: spec.title,
            doctors: spec.doctors.map(doc => ({ 
                name: doc.name, 
                schedule: doc.schedule 
            })),
        }));
    } catch (error) {
        console.error('Gagal mengambil data langsung dari Google Sheets:', error);
        throw new Error(`Tidak dapat mengambil data jadwal: ${error.message}`);
    }
}

/**
 * Menghasilkan potongan HTML untuk daftar dokter dalam satu spesialisasi.
 * @param {Array} data Array berisi data dokter dan jadwal
 * @returns {string} String HTML
 */
function generateHtmlForDoctors(data) {
    let html = '';
    
    data.forEach(spec => {
        html += `<div class="specialization-group">
            <h3 class="specialization-title">${spec.title}</h3>`;
            
        spec.doctors.forEach(doc => {
            html += `<div class="doctor-card">
                <p class="doctor-name">${doc.name}</p>
                <div class="schedule-grid">`;
                
            Object.entries(doc.schedule).forEach(([day, time]) => {
                if (time && time.trim() !== '') {
                    html += `<div class="schedule-day"><strong>${day.slice(0, 3)}:</strong> ${time}</div>`;
                }
            });
            
            html += `</div></div>`;
        });
        
        html += `</div>`;
    });
    
    return html;
}

/**
 * Mengisi template HTML dengan data dokter yang sudah dibagi menjadi 3 kolom.
 * @param {string} templateHtml String template HTML
 * @param {Array} data Data jadwal dokter
 * @returns {string} String HTML yang sudah terisi
 */
async function fillTemplate(templateHtml, data) {
    // Distribusi data ke 3 kolom secara merata
    const columns = [[], [], []];
    data.forEach((spec, index) => {
        columns[index % 3].push(spec);
    });
    
    return templateHtml
        .replace('{{COLUMN_1_HTML}}', generateHtmlForDoctors(columns[0]))
        .replace('{{COLUMN_2_HTML}}', generateHtmlForDoctors(columns[1]))
        .replace('{{COLUMN_3_HTML}}', generateHtmlForDoctors(columns[2]))
        .replace('{{GENERATED_DATE}}', new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }));
}

// Handler utama yang dipanggil oleh Netlify
exports.handler = async (event, context) => {
    console.log('=== FUNGSI GENERATE-BROCHURE DIMULAI ===');
    
    try {
        // Ambil data jadwal (dari cache atau langsung dari Google Sheets)
        const allData = await getJadwalDataFromCache();
        
        if (!allData || allData.length === 0) {
            throw new Error('Tidak ada data jadwal yang ditemukan.');
        }
        
        console.log(`Data berhasil diambil: ${allData.length} spesialisasi`);
        
        // Pisahkan data untuk halaman dalam dan luar
        const outsideSpecializations = ["Urologi", "Kulit & Kelamin"];
        const outsidePageData = allData.filter(spec => outsideSpecializations.includes(spec.title));
        const insidePageData = allData.filter(spec => !outsideSpecializations.includes(spec.title));
        
        console.log(`Halaman dalam: ${insidePageData.length} spesialisasi`);
        console.log(`Halaman luar: ${outsidePageData.length} spesialisasi`);

        // Baca template files
        const insideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-inside.html');
        const outsideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-outside.html');

        console.log('Membaca template files...');
        const [insideTemplate, outsideTemplate] = await Promise.all([
            fs.readFile(insideTemplatePath, 'utf8'),
            fs.readFile(outsideTemplatePath, 'utf8')
        ]);

        // Isi template dengan data
        console.log('Mengisi template dengan data...');
        const insideHtml = await fillTemplate(insideTemplate, insidePageData);
        const outsideHtml = await fillTemplate(outsideTemplate, outsidePageData);

        // Gabungkan kedua halaman dengan pemisah halaman untuk dicetak
        const finalHtml = `
            ${insideHtml}
            <div style="page-break-after: always;"></div>
            ${outsideHtml}
        `;

        console.log('=== FUNGSI GENERATE-BROCHURE BERHASIL ===');
        
        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: finalHtml,
        };
    } catch (error) {
        console.error("!!! ERROR DALAM HANDLER generate-brochure:", error);
        
        const errorHtml = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error - Generator Brosur</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-red-50 min-h-screen flex items-center justify-center">
                <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div class="text-center">
                        <div class="text-red-500 text-6xl mb-4">⚠️</div>
                        <h1 class="text-2xl font-bold text-red-700 mb-4">Terjadi Kesalahan</h1>
                        <p class="text-gray-600 mb-4">${error.message}</p>
                        <div class="bg-gray-100 p-4 rounded text-sm text-left">
                            <p><strong>Saran:</strong></p>
                            <ul class="list-disc list-inside mt-2">
                                <li>Pastikan koneksi internet stabil</li>
                                <li>Coba refresh halaman</li>
                                <li>Hubungi administrator jika masalah berlanjut</li>
                            </ul>
                        </div>
                        <button onclick="window.history.back()" class="mt-6 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors">
                            Kembali
                        </button>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html' },
            body: errorHtml,
        };
    }
};