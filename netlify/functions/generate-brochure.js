const fs = require('fs').promises;
const path = require('path');
const { getStore } = require('@netlify/blobs');
const https = require('https');

const CACHE_KEY = 'jadwal-dokter-cache';
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';

/**
 * Fungsi untuk fetch data dari URL dengan handle redirect
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
                    reject(new Error('Failed to parse JSON response: ' + e.message));
                }
            });
        });
        
        req.on('error', (err) => {
            reject(new Error('Request failed: ' + err.message));
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout setelah 30 detik'));
        });
    });
}

/**
 * Mendapatkan store untuk Netlify Blobs dengan fallback
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
 * Mengambil data jadwal dari cache Netlify Blobs
 */
async function getJadwalDataFromCache() {
    try {
        const jadwalStore = getJadwalStore();
        
        if (!jadwalStore) {
            console.log('Store tidak tersedia, mengambil data langsung dari Google Sheets...');
            return await getJadwalDataDirect();
        }
        
        console.log('Mencoba mengambil data dari cache Netlify Blobs...');
        const cachedData = await jadwalStore.get(CACHE_KEY);
        
        if (!cachedData) {
            console.log('Cache kosong, mengambil data langsung dari Google Sheets...');
            return await getJadwalDataDirect();
        }

        const parsedData = JSON.parse(cachedData);
        console.log('✅ Data berhasil diambil dari cache:', Object.keys(parsedData).length, 'spesialisasi');
        
        // Format data untuk template
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
        console.log('🔄 Mengambil data langsung dari Google Sheets...');
        const jadwalData = await fetchData(GOOGLE_SCRIPT_JADWAL_URL);
        
        if (!jadwalData || Object.keys(jadwalData).length === 0) {
            throw new Error('Data dari Google Sheets kosong atau tidak valid.');
        }
        
        console.log('✅ Berhasil mengambil data langsung dari Google Sheets');
        return Object.values(jadwalData).map(spec => ({
            title: spec.title,
            doctors: spec.doctors.map(doc => ({ 
                name: doc.name, 
                schedule: doc.schedule 
            })),
        }));
    } catch (error) {
        console.error('❌ Gagal mengambil data langsung dari Google Sheets:', error);
        throw new Error(`Tidak dapat mengambil data jadwal: ${error.message}`);
    }
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
                
            // Filter dan format jadwal
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
    // Distribusi data ke 3 kolom secara seimbang
    const columns = [[], [], []];
    data.forEach((spec, index) => {
        columns[index % 3].push(spec);
    });
    
    const generatedDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long', 
        year: 'numeric'
    });
    
    // Untuk preview, batasi jumlah data
    if (isPreview && data.length > 6) {
        columns[0] = columns[0].slice(0, 2);
        columns[1] = columns[1].slice(0, 2);
        columns[2] = columns[2].slice(0, 2);
    }
    
    let filledTemplate = templateHtml
        .replace(/{{COLUMN_1_HTML}}/g, generateHtmlForDoctors(columns[0]))
        .replace(/{{COLUMN_2_HTML}}/g, generateHtmlForDoctors(columns[1]))
        .replace(/{{COLUMN_3_HTML}}/g, generateHtmlForDoctors(columns[2]))
        .replace(/{{GENERATED_DATE}}/g, generatedDate)
        .replace(/{{COLUMN_1_OUTSIDE}}/g, generateHtmlForDoctors(columns[0].slice(0, 2)))
        .replace(/{{COLUMN_2_OUTSIDE}}/g, generateHtmlForDoctors(columns[1].slice(0, 2)))
        .replace(/{{LOGO_SILOAM_PUTIH}}/g, 'https://via.placeholder.com/150x50/FFFFFF/004082?text=LOGO+SILOAM');
    
    return filledTemplate;
}

// Handler utama
exports.handler = async (event, context) => {
    console.log('=== FUNGSI GENERATE-BROCHURE DIMULAI ===');
    
    try {
        const { preview = 'false' } = event.queryStringParameters || {};
        const isPreview = preview === 'true';
        
        console.log(`Mode: ${isPreview ? 'PREVIEW' : 'FULL'}`);
        
        // Ambil data dari cache Netlify Blobs
        const allData = await getJadwalDataFromCache();
        
        if (!allData || allData.length === 0) {
            throw new Error('Tidak ada data jadwal yang ditemukan di cache.');
        }
        
        console.log(`📊 Data berhasil diambil: ${allData.length} spesialisasi`);
        
        // Baca template files
        const templateDir = path.join(process.cwd(), 'public');
        const insideTemplatePath = path.join(templateDir, 'brochure-template-inside.html');
        const outsideTemplatePath = path.join(templateDir, 'brochure-template-outside.html');
        
        console.log('📁 Membaca template files...');
        const [insideTemplate, outsideTemplate] = await Promise.all([
            fs.readFile(insideTemplatePath, 'utf8'),
            fs.readFile(outsideTemplatePath, 'utf8')
        ]);

        // Isi template dengan data
        console.log('🎨 Mengisi template dengan data...');
        const insideHtml = await fillTemplate(insideTemplate, allData, isPreview);
        const outsideHtml = await fillTemplate(outsideTemplate, allData, isPreview);

        // Gabungkan halaman
        let finalHtml;
        if (isPreview) {
            // Untuk preview, hanya tampilkan halaman dalam saja
            finalHtml = insideHtml;
        } else {
            // Untuk cetak, gabungkan kedua halaman
            finalHtml = insideHtml + '<div style="page-break-after: always;"></div>' + outsideHtml;
        }

        console.log('✅ FUNGSI GENERATE-BROCHURE BERHASIL');
        
        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: finalHtml,
        };
        
    } catch (error) {
        console.error('❌ ERROR CRITICAL:', error);
        
        const errorHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Error - Generator Brosur</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        background: #fef2f2; 
                        color: #dc2626; 
                        padding: 40px; 
                        text-align: center;
                    }
                    .error-container {
                        max-width: 500px;
                        margin: 0 auto;
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    h1 { margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1>⚠️ Terjadi Kesalahan</h1>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p>Silakan pastikan:</p>
                    <ul style="text-align: left; margin: 20px 0;">
                        <li>Fungsi cache-jadwal-data sudah dijalankan</li>
                        <li>Data sudah tersimpan di Netlify Blobs</li>
                        <li>Koneksi internet stabil</li>
                    </ul>
                    <button onclick="window.location.reload()" style="background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Coba Lagi</button>
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