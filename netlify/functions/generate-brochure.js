const fs = require('fs').promises;
const path = require('path');
const { getStore } = require('@netlify/blobs');
const https = require('https');

const CACHE_KEY = 'jadwal-dokter-cache';
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';

// Fungsi fetchData tidak perlu diubah
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
                try { resolve(JSON.parse(body)); }
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

// Fungsi getJadwalDataFromCache dan getJadwalDataDirect tidak perlu diubah
async function getJadwalDataFromCache() {
    try {
        const jadwalStore = getStore('jadwal-dokter');
        if (!jadwalStore) {
            return await getJadwalDataDirect();
        }
        const rawData = await jadwalStore.get(CACHE_KEY);
        if (!rawData) {
            return await getJadwalDataDirect();
        }
        const parsedData = JSON.parse(rawData);
        return Object.values(parsedData).map(spec => ({
            title: spec.title,
            doctors: spec.doctors.map(doc => ({ name: doc.name, schedule: doc.schedule })),
        }));
    } catch (error) {
        return await getJadwalDataDirect();
    }
}

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

// Fungsi generateHtmlForDoctors tidak perlu diubah
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

// Handler utama
exports.handler = async (event, context) => {
    console.log('=== FUNGSI GENERATE-BROCHURE (VERSI 2 HALAMAN) DIMULAI ===');
    
    try {
        const allData = await getJadwalDataFromCache();
        if (!allData || allData.length === 0) {
            throw new Error('Tidak ada data jadwal yang ditemukan.');
        }
        
        // --- PERUBAHAN 1: Logika Distribusi Data Baru ---
        // Kita punya 4 kolom untuk diisi jadwal (1 di luar, 3 di dalam).
        // Kita bagi semua data spesialisasi secara merata ke 4 kolom tersebut.
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

        // --- PERUBAHAN 2: Mengisi Template dengan Data yang Sudah Dibagi ---
        const generatedDate = new Date().toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        // Halaman Dalam (3 kolom jadwal)
        const insideHtml = insideTemplate
            .replace('{{COLUMN_1_HTML}}', generateHtmlForDoctors(insideColumn1))
            .replace('{{COLUMN_2_HTML}}', generateHtmlForDoctors(insideColumn2))
            .replace('{{COLUMN_3_HTML}}', generateHtmlForDoctors(insideColumn3))
            .replace('{{GENERATED_DATE}}', generatedDate);

        // Halaman Luar (1 kolom jadwal + cover belakang + cover depan)
        // --- PERUBAHAN 3: Path Logo Diubah Sesuai Permintaan ---
        const logoPath = path.resolve(process.cwd(), 'public', 'asset', 'logo', 'logo.png');
        let logoUrl = 'https://via.placeholder.com/150x50/004082/FFFFFF?text=LOGO';
        try {
            const logoBuffer = await fs.readFile(logoPath);
            logoUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        } catch (error) {
            console.log('Logo utama tidak ditemukan, menggunakan placeholder.');
        }

        const outsideHtml = outsideTemplate
            .replace('{{COLUMN_1_OUTSIDE}}', generateHtmlForDoctors(outsideColumn1))
            .replace('{{COLUMN_2_OUTSIDE}}', '<p>Informasi layanan dan fasilitas lainnya dapat ditambahkan di sini.</p>') // Kolom tengah belakang bisa diisi konten lain
            .replace('{{LOGO_SILOAM_PUTIH}}', logoUrl); // Placeholder tetap sama, tapi isinya diubah

        // Gabungkan kedua halaman
        const finalHtml = `
            ${insideHtml}
            <div style="page-break-after: always;"></div>
            ${outsideHtml}
        `;

        console.log('=== FUNGSI GENERATE-BROCHURE BERHASIL (VERSI 2 HALAMAN) ===');
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
            body: finalHtml,
        };
    } catch (error) {
        console.error("!!! ERROR DALAM HANDLER generate-brochure:", error);
        // Error handling tidak perlu diubah
        const errorHtml = `...`; // (Konten HTML error sama seperti sebelumnya)
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html' },
            body: errorHtml,
        };
    }
};