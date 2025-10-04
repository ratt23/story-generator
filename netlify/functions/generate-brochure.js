const fs = require('fs').promises;
const path = require('path');
const { getStore } = require('@netlify/blobs');
const https = require('https');

const CACHE_KEY = 'jadwal-dokter-cache';
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';

// Fallback data untuk emergency
const emergencyFallbackData = [
    {
        title: "Penyakit Dalam",
        doctors: [
            {
                name: "Dr. John Doe, Sp.PD",
                schedule: {
                    Senin: "08:00 - 12:00",
                    Selasa: "13:00 - 17:00",
                    Rabu: "08:00 - 12:00"
                }
            }
        ]
    },
    {
        title: "Anak", 
        doctors: [
            {
                name: "Dr. Jane Smith, Sp.A",
                schedule: {
                    Kamis: "08:00 - 12:00", 
                    Jumat: "13:00 - 17:00"
                }
            }
        ]
    },
    {
        title: "Bedah",
        doctors: [
            {
                name: "Dr. Michael Brown, Sp.B",
                schedule: {
                    Selasa: "08:00 - 12:00",
                    Kamis: "08:00 - 12:00"
                }
            }
        ]
    }
];

/**
 * Fungsi fetch data dari URL
 */
function fetchData(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Failed to parse JSON: ' + e.message));
                }
            });
        });
        
        req.on('error', (err) => {
            reject(new Error('Request failed: ' + err.message));
        });
        
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
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
 * Mengambil data dari cache Netlify Blobs
 */
async function getJadwalDataFromCache() {
    try {
        console.log('🔍 Mencari data di cache Netlify Blobs...');
        const jadwalStore = getJadwalStore();
        
        if (!jadwalStore) {
            console.log('❌ Blobs store tidak tersedia');
            return null;
        }
        
        const cachedData = await jadwalStore.get(CACHE_KEY);
        
        if (!cachedData) {
            console.log('❌ Cache kosong');
            return null;
        }

        const parsedData = JSON.parse(cachedData);
        console.log('✅ Data ditemukan di cache:', Object.keys(parsedData).length, 'spesialisasi');
        
        return Object.values(parsedData).map(spec => ({
            title: spec.title,
            doctors: spec.doctors.map(doc => ({ 
                name: doc.name, 
                schedule: doc.schedule 
            })),
        }));
    } catch (error) {
        console.log('❌ Error akses cache:', error.message);
        return null;
    }
}

/**
 * Mengambil data langsung dari Google Sheets
 */
async function getJadwalDataDirect() {
    try {
        console.log('🌐 Mengambil data langsung dari Google Sheets...');
        const jadwalData = await fetchData(GOOGLE_SCRIPT_JADWAL_URL);
        
        if (!jadwalData || Object.keys(jadwalData).length === 0) {
            throw new Error('Data dari Google Sheets kosong');
        }
        
        console.log('✅ Berhasil mengambil data langsung');
        return Object.values(jadwalData).map(spec => ({
            title: spec.title,
            doctors: spec.doctors.map(doc => ({ 
                name: doc.name, 
                schedule: doc.schedule 
            })),
        }));
    } catch (error) {
        console.error('❌ Gagal mengambil data langsung:', error.message);
        return null;
    }
}

/**
 * Mengambil data dengan prioritas: Cache -> Google Sheets -> Fallback
 */
async function getJadwalData() {
    // Coba dari cache dulu
    let data = await getJadwalDataFromCache();
    
    // Jika cache kosong, coba langsung dari Google Sheets
    if (!data) {
        console.log('🔄 Cache kosong, mencoba dari Google Sheets...');
        data = await getJadwalDataDirect();
    }
    
    // Jika masih gagal, gunakan fallback data
    if (!data) {
        console.log('⚠️ Menggunakan emergency fallback data');
        data = emergencyFallbackData;
    }
    
    return data;
}

/**
 * Menghasilkan HTML untuk daftar dokter
 */
function generateHtmlForDoctors(data) {
    if (!data || data.length === 0) {
        return '<div class="specialization-group"><p class="no-data">Tidak ada data jadwal</p></div>';
    }
    
    let html = '';
    
    data.forEach(spec => {
        if (!spec.doctors || spec.doctors.length === 0) return;
        
        html += `<div class="specialization-group">
            <h3 class="specialization-title">${spec.title || 'Spesialis'}</h3>`;
            
        spec.doctors.forEach(doc => {
            if (!doc.name) return;
            
            html += `<div class="doctor-card">
                <p class="doctor-name">${doc.name}</p>
                <div class="schedule-grid">`;
                
            const scheduleEntries = Object.entries(doc.schedule || {})
                .filter(([day, time]) => time && time.trim() !== '' && time.trim() !== '-');
                
            if (scheduleEntries.length === 0) {
                html += `<div class="schedule-day full-width">Jadwal tidak tersedia</div>`;
            } else {
                scheduleEntries.forEach(([day, time]) => {
                    const dayAbbr = day.substring(0, 3);
                    html += `<div class="schedule-day"><strong>${dayAbbr}:</strong> ${time}</div>`;
                });
            }
            
            html += `</div></div>`;
        });
        
        html += `</div>`;
    });
    
    return html;
}

/**
 * Mengisi template dengan data
 */
async function fillTemplate(templateHtml, data, isPreview = false) {
    // Distribusi data ke 3 kolom
    const columns = [[], [], []];
    data.forEach((spec, index) => {
        columns[index % 3].push(spec);
    });
    
    const generatedDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long', 
        year: 'numeric'
    });
    
    // Untuk preview, batasi data
    if (isPreview) {
        columns.forEach(col => {
            if (col.length > 2) col.length = 2; // Maksimal 2 spesialisasi per kolom di preview
        });
    }
    
    let filledTemplate = templateHtml
        .replace(/{{COLUMN_1_HTML}}/g, generateHtmlForDoctors(columns[0]))
        .replace(/{{COLUMN_2_HTML}}/g, generateHtmlForDoctors(columns[1]))
        .replace(/{{COLUMN_3_HTML}}/g, generateHtmlForDoctors(columns[2]))
        .replace(/{{GENERATED_DATE}}/g, generatedDate)
        .replace(/{{COLUMN_1_OUTSIDE}}/g, generateHtmlForDoctors(columns[0].slice(0, 1)))
        .replace(/{{COLUMN_2_OUTSIDE}}/g, generateHtmlForDoctors(columns[1].slice(0, 1)))
        .replace(/{{LOGO_SILOAM_PUTIH}}/g, 'https://via.placeholder.com/150x50/FFFFFF/004082?text=SILOAM+HOSPITALS');
    
    return filledTemplate;
}

// Handler utama
exports.handler = async (event, context) => {
    console.log('=== FUNGSI GENERATE-BROCHURE DIMULAI ===');
    
    try {
        const { preview = 'false' } = event.queryStringParameters || {};
        const isPreview = preview === 'true';
        
        console.log(`🎯 Mode: ${isPreview ? 'PREVIEW' : 'FULL'}`);
        
        // Ambil data dengan sistem fallback
        const allData = await getJadwalData();
        
        if (!allData || allData.length === 0) {
            throw new Error('Tidak dapat mengambil data jadwal dari sumber manapun.');
        }
        
        console.log(`📊 Data siap: ${allData.length} spesialisasi`);
        
        // Baca template
        const templateDir = path.join(process.cwd(), 'public');
        let insideTemplate, outsideTemplate;
        
        try {
            insideTemplate = await fs.readFile(path.join(templateDir, 'brochure-template-inside.html'), 'utf8');
            outsideTemplate = await fs.readFile(path.join(templateDir, 'brochure-template-outside.html'), 'utf8');
        } catch (error) {
            throw new Error(`Template tidak ditemukan: ${error.message}`);
        }

        // Isi template
        const insideHtml = await fillTemplate(insideTemplate, allData, isPreview);
        const outsideHtml = await fillTemplate(outsideTemplate, allData, isPreview);

        // Gabungkan berdasarkan mode
        let finalHtml;
        if (isPreview) {
            finalHtml = insideHtml; // Preview hanya tampilkan halaman dalam
        } else {
            finalHtml = insideHtml + '<div style="page-break-after: always;"></div>' + outsideHtml;
        }

        console.log('✅ FUNGSI GENERATE-BROCHURE BERHASIL');
        
        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache'
            },
            body: finalHtml,
        };
        
    } catch (error) {
        console.error('❌ ERROR:', error);
        
        const errorHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Error - Generator Brosur</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #fef2f2; color: #dc2626; }
                    .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    h1 { margin-bottom: 20px; }
                    button { background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>⚠️ Terjadi Kesalahan</h1>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p>Silakan coba beberapa saat lagi atau hubungi administrator.</p>
                    <button onclick="window.location.reload()">Coba Lagi</button>
                </div>
            </body>
            </html>
        `;
        
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: errorHtml
        };
    }
};