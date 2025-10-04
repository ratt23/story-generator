const fs = require('fs').promises;
const path = require('path');
const { getStore } = require('@netlify/blobs');

const CACHE_KEY = 'jadwal-dokter-cache';

// Fungsi fetchData yang lebih robust
function fetchData(url) {
    return new Promise((resolve, reject) => {
        const https = require('https');
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
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// Fallback data untuk testing
const fallbackData = [
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
    }
];

/**
 * Mengambil data jadwal - dengan fallback jika ada masalah
 */
async function getJadwalData() {
    try {
        console.log('Mencoba mengambil data dari cache...');
        const jadwalStore = getStore('jadwal-dokter');
        const rawData = await jadwalStore.get(CACHE_KEY);
        
        if (rawData) {
            const parsedData = JSON.parse(rawData);
            console.log('Data berhasil diambil dari cache');
            return Object.values(parsedData).map(spec => ({
                title: spec.title,
                doctors: spec.doctors.map(doc => ({ 
                    name: doc.name, 
                    schedule: doc.schedule 
                })),
            }));
        }
        
        throw new Error('Cache kosong');
    } catch (error) {
        console.log('Menggunakan fallback data:', error.message);
        return fallbackData;
    }
}

/**
 * Menghasilkan HTML untuk daftar dokter
 */
function generateHtmlForDoctors(data) {
    if (!data || data.length === 0) {
        return '<div class="specialization-group"><p class="text-gray-500">Tidak ada data jadwal</p></div>';
    }
    
    let html = '';
    
    data.forEach(spec => {
        html += `<div class="specialization-group">
            <h3 class="specialization-title">${spec.title}</h3>`;
            
        spec.doctors.forEach(doc => {
            html += `<div class="doctor-card">
                <p class="doctor-name">${doc.name}</p>
                <div class="schedule-grid">`;
                
            // Filter hanya hari yang memiliki jadwal
            const scheduleEntries = Object.entries(doc.schedule || {}).filter(([_, time]) => 
                time && time.trim() !== '' && time.trim() !== '-'
            );
            
            if (scheduleEntries.length === 0) {
                html += `<div class="schedule-day">Jadwal tidak tersedia</div>`;
            } else {
                scheduleEntries.forEach(([day, time]) => {
                    html += `<div class="schedule-day"><strong>${day.slice(0, 3)}:</strong> ${time}</div>`;
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
async function fillTemplate(templateHtml, data) {
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
    
    return templateHtml
        .replace(/{{COLUMN_1_HTML}}/g, generateHtmlForDoctors(columns[0]))
        .replace(/{{COLUMN_2_HTML}}/g, generateHtmlForDoctors(columns[1]))
        .replace(/{{COLUMN_3_HTML}}/g, generateHtmlForDoctors(columns[2]))
        .replace(/{{GENERATED_DATE}}/g, generatedDate)
        .replace(/{{COLUMN_1_OUTSIDE}}/g, generateHtmlForDoctors(columns[0]))
        .replace(/{{COLUMN_2_OUTSIDE}}/g, generateHtmlForDoctors(columns[1]))
        .replace(/{{LOGO_SILOAM_PUTIH}}/g, 'https://via.placeholder.com/150x50/FFFFFF/004082?text=SILOAM');
}

// Handler utama
exports.handler = async (event, context) => {
    console.log('=== FUNGSI GENERATE-BROCHURE DIMULAI ===');
    
    try {
        // Ambil data
        const allData = await getJadwalData();
        console.log('Data berhasil diambil:', allData.length, 'spesialisasi');
        
        // Baca template files dengan error handling
        let insideTemplate, outsideTemplate;
        
        try {
            const insideTemplatePath = path.join(process.cwd(), 'public', 'brochure-template-inside.html');
            const outsideTemplatePath = path.join(process.cwd(), 'public', 'brochure-template-outside.html');
            
            console.log('Membaca template dari:', insideTemplatePath);
            
            [insideTemplate, outsideTemplate] = await Promise.all([
                fs.readFile(insideTemplatePath, 'utf8'),
                fs.readFile(outsideTemplatePath, 'utf8')
            ]);
        } catch (templateError) {
            console.error('Error membaca template:', templateError);
            // Fallback template sederhana
            insideTemplate = `
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"><title>Brosur</title></head>
                <body>
                    <h1>Jadwal Dokter</h1>
                    {{COLUMN_1_HTML}}
                    {{COLUMN_2_HTML}} 
                    {{COLUMN_3_HTML}}
                    <p>Update: {{GENERATED_DATE}}</p>
                </body>
                </html>
            `;
            outsideTemplate = insideTemplate;
        }

        // Isi template
        const insideHtml = await fillTemplate(insideTemplate, allData);
        const outsideHtml = await fillTemplate(outsideTemplate, allData);

        // Gabungkan halaman
        const finalHtml = insideHtml + '<div style="page-break-after: always;"></div>' + outsideHtml;

        console.log('=== FUNGSI GENERATE-BROCHURE BERHASIL ===');
        
        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache'
            },
            body: finalHtml,
        };
        
    } catch (error) {
        console.error('!!! ERROR CRITICAL:', error);
        
        // Return error page yang sederhana
        const errorHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><title>Error</title></head>
            <body>
                <h1>Terjadi Kesalahan</h1>
                <p>${error.message}</p>
                <p>Silakan coba lagi atau hubungi administrator.</p>
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