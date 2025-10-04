const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';

// Fallback data jika semua sumber gagal
const fallbackData = [
    {
        title: "Penyakit Dalam",
        doctors: [
            {
                name: "Dr. Contoh Dokter, Sp.PD",
                schedule: {
                    Senin: "08:00 - 12:00",
                    Rabu: "08:00 - 12:00",
                    Jumat: "13:00 - 17:00"
                }
            }
        ]
    },
    {
        title: "Anak",
        doctors: [
            {
                name: "Dr. Contoh Spesialis, Sp.A", 
                schedule: {
                    Selasa: "08:00 - 12:00",
                    Kamis: "13:00 - 17:00"
                }
            }
        ]
    }
];

/**
 * Fetch data dari Google Sheets
 */
function fetchGoogleSheetsData() {
    return new Promise((resolve, reject) => {
        console.log('📡 Mengambil data dari Google Sheets...');
        
        const req = https.get(GOOGLE_SCRIPT_JADWAL_URL, (res) => {
            let data = '';
            
            // Handle redirect
            if (res.statusCode === 301 || res.statusCode === 302) {
                const redirectUrl = new URL(res.headers.location, GOOGLE_SCRIPT_JADWAL_URL).href;
                console.log('🔄 Redirect ke:', redirectUrl);
                return resolve(fetchGoogleSheetsData());
            }
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    console.log('✅ Data berhasil diambil dari Google Sheets');
                    resolve(parsedData);
                } catch (e) {
                    reject(new Error('Gagal parse data dari Google Sheets'));
                }
            });
        });
        
        req.on('error', (err) => {
            reject(new Error('Koneksi ke Google Sheets gagal: ' + err.message));
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Timeout koneksi ke Google Sheets'));
        });
    });
}

/**
 * Ambil data dengan prioritas: Google Sheets -> Fallback
 */
async function getJadwalData() {
    try {
        const jadwalData = await fetchGoogleSheetsData();
        
        if (!jadwalData || Object.keys(jadwalData).length === 0) {
            throw new Error('Data dari Google Sheets kosong');
        }
        
        // Format data untuk template
        return Object.values(jadwalData).map(spec => ({
            title: spec.title,
            doctors: spec.doctors.map(doc => ({
                name: doc.name,
                schedule: doc.schedule
            }))
        }));
    } catch (error) {
        console.log('❌ Gagal ambil dari Google Sheets:', error.message);
        console.log('🔄 Menggunakan fallback data');
        return fallbackData;
    }
}

/**
 * Generate HTML untuk daftar dokter
 */
function generateHtmlForDoctors(data) {
    if (!data || data.length === 0) {
        return '<div class="specialization-group"><p class="no-data">Tidak ada data jadwal</p></div>';
    }
    
    let html = '';
    
    data.forEach(spec => {
        html += `<div class="specialization-group">
            <h3 class="specialization-title">${spec.title}</h3>`;
            
        spec.doctors.forEach(doc => {
            html += `<div class="doctor-card">
                <p class="doctor-name">${doc.name}</p>
                <div class="schedule-grid">`;
                
            // Filter jadwal yang ada
            const scheduleEntries = Object.entries(doc.schedule || {})
                .filter(([_, time]) => time && time.trim() !== '' && time.trim() !== '-');
                
            if (scheduleEntries.length === 0) {
                html += `<div class="schedule-day">Jadwal tidak tersedia</div>`;
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
 * Generate brosur 2 halaman lengkap
 */
async function generateBrochureHTML(allData, isPreview = false) {
    // Baca template files
    const templateDir = path.join(process.cwd(), 'public');
    const insideTemplate = await fs.readFile(path.join(templateDir, 'brochure-template-inside.html'), 'utf8');
    const outsideTemplate = await fs.readFile(path.join(templateDir, 'brochure-template-outside.html'), 'utf8');

    // Distribusi data untuk 3 kolom
    const columns = [[], [], []];
    allData.forEach((spec, index) => {
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
            if (col.length > 2) col.splice(2); // Maksimal 2 spesialisasi per kolom di preview
        });
    }

    // Generate HTML untuk setiap kolom
    const column1HTML = generateHtmlForDoctors(columns[0]);
    const column2HTML = generateHtmlForDoctors(columns[1]); 
    const column3HTML = generateHtmlForDoctors(columns[2]);

    // Isi template inside
    const insideHtml = insideTemplate
        .replace(/{{COLUMN_1_HTML}}/g, column1HTML)
        .replace(/{{COLUMN_2_HTML}}/g, column2HTML)
        .replace(/{{COLUMN_3_HTML}}/g, column3HTML)
        .replace(/{{GENERATED_DATE}}/g, generatedDate);

    // Isi template outside (gunakan data terbatas)
    const outsideHtml = outsideTemplate
        .replace(/{{COLUMN_1_OUTSIDE}}/g, generateHtmlForDoctors(columns[0].slice(0, 1)))
        .replace(/{{COLUMN_2_OUTSIDE}}/g, generateHtmlForDoctors(columns[1].slice(0, 1)))
        .replace(/{{LOGO_SILOAM_PUTIH}}/g, 'https://via.placeholder.com/150x50/FFFFFF/004082?text=SILOAM+HOSPITALS');

    // Gabungkan 2 halaman
    if (isPreview) {
        return insideHtml; // Preview hanya tampilkan halaman dalam
    } else {
        return insideHtml + '<div style="page-break-after: always;"></div>' + outsideHtml;
    }
}

// Handler utama
exports.handler = async (event, context) => {
    console.log('=== FUNGSI GENERATE-BROCHURE DIMULAI ===');
    
    try {
        const { preview = 'false' } = event.queryStringParameters || {};
        const isPreview = preview === 'true';
        
        console.log(`🎯 Mode: ${isPreview ? 'PREVIEW' : 'FULL'}`);
        
        // Ambil data langsung dari Google Sheets
        const allData = await getJadwalData();
        
        if (!allData || allData.length === 0) {
            throw new Error('Tidak ada data jadwal yang dapat diambil');
        }
        
        console.log(`✅ Data siap: ${allData.length} spesialisasi`);
        
        // Generate brosur
        const finalHtml = await generateBrochureHTML(allData, isPreview);
        
        console.log('🎉 Brosur berhasil di-generate');
        
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
        
        // Error page sederhana
        const errorHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Error</title>
                <style>
                    body { font-family: Arial; padding: 40px; text-align: center; }
                    .error { background: #fee; padding: 20px; border-radius: 10px; }
                </style>
            </head>
            <body>
                <div class="error">
                    <h1>⚠️ Terjadi Kesalahan</h1>
                    <p>${error.message}</p>
                    <p>Silakan refresh halaman dan coba lagi.</p>
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