const fs = require('fs').promises;
const path = require('path');

// Fallback data yang lebih lengkap
const fallbackData = [
    {
        title: "Penyakit Dalam",
        doctors: [
            {
                name: "Dr. John Doe, Sp.PD",
                schedule: {
                    Senin: "08:00 - 12:00",
                    Selasa: "13:00 - 17:00", 
                    Rabu: "08:00 - 12:00",
                    Kamis: "13:00 - 17:00"
                }
            },
            {
                name: "Dr. Sarah Smith, Sp.PD",
                schedule: {
                    Rabu: "13:00 - 17:00",
                    Kamis: "08:00 - 12:00",
                    Jumat: "08:00 - 12:00"
                }
            }
        ]
    },
    {
        title: "Anak",
        doctors: [
            {
                name: "Dr. Jane Wilson, Sp.A",
                schedule: {
                    Senin: "13:00 - 17:00",
                    Rabu: "08:00 - 12:00",
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
 * Mengambil data jadwal - menggunakan fallback untuk testing
 */
async function getJadwalData() {
    try {
        console.log('Menggunakan fallback data untuk testing');
        return fallbackData;
    } catch (error) {
        console.log('Error, menggunakan fallback data:', error.message);
        return fallbackData;
    }
}

/**
 * Menghasilkan HTML untuk daftar dokter dengan formatting yang benar
 */
function generateHtmlForDoctors(data) {
    if (!data || data.length === 0) {
        return '<div class="specialization-group"><p class="text-gray-500" style="color: #64748b; font-style: italic;">Tidak ada data jadwal</p></div>';
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
                .filter(([day, time]) => time && time.trim() !== '' && time.trim() !== '-')
                .slice(0, 6); // Batasi maksimal 6 jadwal per dokter
                
            if (scheduleEntries.length === 0) {
                html += `<div class="schedule-day" style="grid-column: 1 / -1;">Jadwal tidak tersedia</div>`;
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
async function fillTemplate(templateHtml, data) {
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
    
    // Replace semua placeholder
    let filledTemplate = templateHtml
        .replace(/{{COLUMN_1_HTML}}/g, generateHtmlForDoctors(columns[0]))
        .replace(/{{COLUMN_2_HTML}}/g, generateHtmlForDoctors(columns[1]))
        .replace(/{{COLUMN_3_HTML}}/g, generateHtmlForDoctors(columns[2]))
        .replace(/{{GENERATED_DATE}}/g, generatedDate);
    
    return filledTemplate;
}

// Handler utama
exports.handler = async (event, context) => {
    console.log('=== FUNGSI GENERATE-BROCHURE DIMULAI ===');
    
    try {
        // Ambil data
        const allData = await getJadwalData();
        console.log('Data berhasil diambil:', allData.length, 'spesialisasi');
        
        // Baca template files
        let insideTemplate, outsideTemplate;
        const templateDir = path.join(process.cwd(), 'public');
        
        try {
            insideTemplate = await fs.readFile(path.join(templateDir, 'brochure-template-inside.html'), 'utf8');
            outsideTemplate = await fs.readFile(path.join(templateDir, 'brochure-template-outside.html'), 'utf8');
            console.log('Template files berhasil dibaca');
        } catch (templateError) {
            console.error('Error membaca template:', templateError);
            throw new Error('Template files tidak ditemukan');
        }

        // Isi template dengan data
        console.log('Mengisi template dengan data...');
        const insideHtml = await fillTemplate(insideTemplate, allData);
        const outsideHtml = await fillTemplate(outsideTemplate, allData.slice(0, 2)); // Batasi data untuk outside

        // Gabungkan halaman
        const finalHtml = insideHtml + '<div style="page-break-after: always;"></div>' + outsideHtml;

        console.log('=== FUNGSI GENERATE-BROCHURE BERHASIL ===');
        
        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: finalHtml,
        };
        
    } catch (error) {
        console.error('!!! ERROR CRITICAL:', error);
        
        // Return error page yang informatif
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
                    button { 
                        background: #dc2626; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 5px; 
                        cursor: pointer;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1>⚠️ Terjadi Kesalahan</h1>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p>Silakan coba lagi atau hubungi administrator.</p>
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