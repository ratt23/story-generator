const fs = require('fs').promises;
const path = require('path');
const { getStore } = require('@netlify/blobs');
const https = require('https');

const CACHE_KEY = 'jadwal-dokter-cache';
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';

/**
 * Fungsi untuk fetch data dari URL dengan handle redirect
 */
function fetchData(url, redirectCount = 0) {
    if (redirectCount > 5) {
        return Promise.reject(new Error('Terlalu banyak pengalihan (redirect).'));
    }
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
                const redirectUrl = new URL(res.headers.location, url).href;
                return resolve(fetchData(redirectUrl, redirectCount + 1));
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP status code ${res.statusCode}`));
            }
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try { 
                    const parsedData = JSON.parse(body);
                    resolve(parsedData);
                }
                catch (e) { reject(new Error('Gagal mem-parsing respons JSON.')); }
            });
        });
        req.on('error', (err) => reject(err));
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout setelah 30 detik'));
        });
    });
}

/**
 * Mengambil data jadwal dari cache atau langsung dari Google Sheets
 */
async function getJadwalDataFromCache() {
    try {
        const jadwalStore = getStore('jadwal-dokter');
        if (!jadwalStore) {
            console.log('Store tidak tersedia, mengambil data langsung...');
            return await getJadwalDataDirect();
        }
        const rawData = await jadwalStore.get(CACHE_KEY);
        if (!rawData) {
            console.log('Cache kosong, mengambil data langsung...');
            return await getJadwalDataDirect();
        }
        const parsedData = JSON.parse(rawData);
        return Object.values(parsedData).map(spec => ({
            title: spec.title,
            doctors: spec.doctors.map(doc => ({ name: doc.name, schedule: doc.schedule })),
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
    const jadwalData = await fetchData(GOOGLE_SCRIPT_JADWAL_URL);
    if (!jadwalData || Object.keys(jadwalData).length === 0) {
        throw new Error('Data dari Google Sheets kosong atau tidak valid.');
    }
    return Object.values(jadwalData).map(spec => ({
        title: spec.title,
        doctors: spec.doctors.map(doc => ({ name: doc.name, schedule: doc.schedule })),
    }));
}

/**
 * Menghasilkan potongan HTML untuk daftar dokter dalam satu spesialisasi.
 */
function generateHtmlForDoctors(data) {
    if (!data || data.length === 0) return '';
    let html = '';
    data.forEach(spec => {
        html += `<div class="specialization-group">
            <h3 class="specialization-title">${spec.title}</h3>`;
        spec.doctors.forEach(doc => {
            html += `<div class="doctor-card">
                <p class="doctor-name">${doc.name}</p>
                <div class="schedule-grid">`;
            const scheduleEntries = Object.entries(doc.schedule || {}).filter(([_, time]) => time && time.trim() !== '' && time.trim() !== '-');
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
 * Handler utama Netlify Function
 */
exports.handler = async (event, context) => {
    try {
        const allData = await getJadwalDataFromCache();
        if (!allData || allData.length === 0) {
            throw new Error('Tidak ada data jadwal yang ditemukan.');
        }
        
        // Logika Distribusi Data Dinamis ke 4 kolom
        const totalSpecializations = allData.length;
        const itemsPerColumn = Math.ceil(totalSpecializations / 4);
        
        const columnData = [];
        for (let i = 0; i < 4; i++) {
            const start = i * itemsPerColumn;
            const end = start + itemsPerColumn;
            columnData.push(allData.slice(start, end));
        }

        const [outsideColumn1, insideColumn1, insideColumn2, insideColumn3] = columnData;

        // Baca template files
        const insideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-inside.html');
        const outsideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-outside.html');
        const [insideTemplate, outsideTemplate] = await Promise.all([
            fs.readFile(insideTemplatePath, 'utf8'),
            fs.readFile(outsideTemplatePath, 'utf8')
        ]);

        const generatedDate = new Date().toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        // Mengisi Halaman Dalam
        const insideHtml = insideTemplate
            .replace('{{COLUMN_1_HTML}}', generateHtmlForDoctors(insideColumn1))
            .replace('{{COLUMN_2_HTML}}', generateHtmlForDoctors(insideColumn2))
            .replace('{{COLUMN_3_HTML}}', generateHtmlForDoctors(insideColumn3))
            .replace('{{GENERATED_DATE}}', generatedDate);

        // Path ke logo berwarna untuk cover putih
        const logoPath = path.resolve(process.cwd(), 'public', 'asset', 'logo', 'logo.png');
        let logoUrl = 'https://via.placeholder.com/150x50/004082/FFFFFF?text=LOGO';
        try {
            const logoBuffer = await fs.readFile(logoPath);
            logoUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        } catch (error) {
            console.log('Logo utama (berwarna) tidak ditemukan, menggunakan placeholder.');
        }

        // Mengisi Halaman Luar
        const outsideHtml = outsideTemplate
            .replace('{{COLUMN_1_OUTSIDE}}', generateHtmlForDoctors(outsideColumn1))
            .replace('{{COLUMN_2_OUTSIDE}}', '') // Kosongkan kolom tengah belakang, atau isi dengan info lain
            .replace('{{LOGO_SILOAM_WARNA}}', logoUrl);

        // Gabungkan kedua halaman menjadi satu dokumen HTML
        const finalHtml = `
            ${insideHtml}
            <div style="page-break-after: always;"></div>
            ${outsideHtml}
        `;
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
            body: finalHtml,
        };
    } catch (error) {
        console.error("!!! ERROR DALAM HANDLER generate-brochure:", error);
        
        const errorHtml = `
            <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Error</title></head>
            <body><h1>Terjadi Kesalahan</h1><p>${error.message}</p></body></html>
        `;
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html' },
            body: errorHtml,
        };
    }
};