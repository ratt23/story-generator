const fs = require('fs').promises;
const path = require('path');
const { getStore } = require('@netlify/blobs');
const https = require('https');

const CACHE_KEY = 'jadwal-dokter-cache';
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';

/**
 * Fungsi untuk mengambil data dari URL dengan penanganan redirect.
 */
function fetchData(url, redirectCount = 0) {
    if (redirectCount > 5) {
        return Promise.reject(new Error('Terlalu banyak pengalihan (redirect).'));
    }
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if ([301, 302, 307].includes(res.statusCode)) {
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
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Gagal mem-parsing respons JSON.'));
                }
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
 * Mengambil data jadwal dari cache Netlify Blobs, dengan fallback ke Google Sheets.
 */
async function getJadwalDataFromCache() {
    try {
        const jadwalStore = getStore('jadwal-dokter');
        const rawData = await jadwalStore.get(CACHE_KEY);
        if (!rawData) {
            console.log('Cache not found, fetching directly from Google Sheets.');
            return await getJadwalDataDirect();
        }
        const parsedData = JSON.parse(rawData);
        return Object.values(parsedData);
    } catch (error) {
        console.warn('Failed to get data from cache, fetching directly.', error);
        return await getJadwalDataDirect();
    }
}

/**
 * Mengambil data jadwal langsung dari Google Sheets.
 */
async function getJadwalDataDirect() {
    const jadwalData = await fetchData(GOOGLE_SCRIPT_JADWAL_URL);
    if (!jadwalData || Object.keys(jadwalData).length === 0) {
        throw new Error('Data dari Google Sheets kosong atau tidak valid.');
    }
    return Object.values(jadwalData);
}

/**
 * Menghasilkan potongan HTML untuk daftar dokter dalam satu set data.
 */
function generateHtmlForDoctors(data) {
    if (!data || data.length === 0) return '';
    let html = '';
    data.forEach(spec => {
        if (!spec.doctors || spec.doctors.length === 0) return;
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
                    html += `<div class="schedule-day"><strong>${day}:</strong> ${time}</div>`;
                });
            }
            html += `</div></div>`;
        });
        html += `</div>`;
    });
    return html;
}

/**
 * Handler utama Netlify Function.
 */
exports.handler = async (event, context) => {
    try {
        const allData = await getJadwalDataFromCache();
        if (!allData || allData.length === 0) {
            throw new Error('Tidak ada data jadwal yang ditemukan.');
        }

        // --- LOGIKA DISTRIBUSI BARU ---
        const totalDoctors = allData.reduce((sum, spec) => sum + (spec.doctors ? spec.doctors.length : 0), 0);
        const targetOutsideCount = Math.ceil(totalDoctors / 4.5); // Alokasikan porsi sedikit lebih kecil untuk halaman luar

        let outsideData = [];
        let insideData = [];
        let currentOutsideCount = 0;

        allData.forEach(spec => {
            if (currentOutsideCount < targetOutsideCount) {
                outsideData.push(spec);
                currentOutsideCount += spec.doctors ? spec.doctors.length : 0;
            } else {
                insideData.push(spec);
            }
        });
        
        // Baca file template
        const insideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-inside.html');
        const outsideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-outside.html');
        const [insideTemplate, outsideTemplate] = await Promise.all([
            fs.readFile(insideTemplatePath, 'utf8'),
            fs.readFile(outsideTemplatePath, 'utf8')
        ]);

        const generatedDate = new Date().toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        // Proses HTML untuk halaman dalam (semua data sisanya)
        const allInsideHtml = generateHtmlForDoctors(insideData);
        const insideHtml = insideTemplate
            .replace('{{ALL_DOCTORS_HTML}}', allInsideHtml)
            .replace('{{GENERATED_DATE}}', generatedDate);

        // Siapkan logo untuk cover depan
        const logoPath = path.resolve(process.cwd(), 'public', 'asset', 'logo', 'logo.png');
        let logoUrl = '';
        try {
            const logoBuffer = await fs.readFile(logoPath);
            logoUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        } catch (error) {
            console.log('Logo utama (berwarna) tidak ditemukan, akan kosong.');
        }

        // Proses HTML untuk halaman luar
        const outsideColumn1Html = generateHtmlForDoctors(outsideData);
        const outsideHtml = outsideTemplate
            .replace('{{COLUMN_1_OUTSIDE}}', outsideColumn1Html)
            .replace('{{COLUMN_2_OUTSIDE}}', '') // Kolom tengah belakang dikosongkan
            .replace('{{LOGO_SILOAM_WARNA}}', logoUrl);

        // Gabungkan kedua halaman untuk hasil akhir
        const finalHtml = `${insideHtml}<div style="page-break-after: always;"></div>${outsideHtml}`;
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
            body: finalHtml,
        };
    } catch (error) {
        console.error("ERROR DALAM HANDLER generate-brochure:", error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html' },
            body: `<html><body><h1>Terjadi Kesalahan Server</h1><p>${error.message}</p></body></html>`,
        };
    }
};