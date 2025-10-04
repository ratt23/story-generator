const fs = require('fs').promises;
const path = require('path');
const { getStore } = require('@netlify/blobs');
const https = require('https');

const CACHE_KEY = 'jadwal-dokter-cache';
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY_oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';

// Helper function untuk mengubah gambar lokal menjadi Data URI (base64)
async function imageToUrl(imagePathOrUrl) {
    if (!imagePathOrUrl || imagePathOrUrl.startsWith('http')) {
        return imagePathOrUrl || ''; // Kembalikan URL eksternal atau string kosong
    }
    // Asumsikan ini adalah path lokal, relatif terhadap folder public
    const absolutePath = path.resolve(process.cwd(), 'public', imagePathOrUrl);
    try {
        const imageBuffer = await fs.readFile(absolutePath);
        const extension = path.extname(absolutePath).toLowerCase().slice(1);
        const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        console.error(`Gambar lokal tidak ditemukan atau gagal dibaca: ${absolutePath}`, error);
        return ''; // Kembalikan kosong jika error
    }
}

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

async function getJadwalDataFromCache() {
    try {
        const jadwalStore = getStore('jadwal-dokter');
        if (!jadwalStore) return await getJadwalDataDirect();
        const rawData = await jadwalStore.get(CACHE_KEY);
        if (!rawData) return await getJadwalDataDirect();
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

function generateHtmlForDoctors(data) {
    if (!data || data.length === 0) return '';
    let html = '';
    data.forEach(spec => {
        html += `<div class="specialization-group"><h3 class="specialization-title">${spec.title}</h3>`;
        spec.doctors.forEach(doc => {
            html += `<div class="doctor-card"><p class="doctor-name">${doc.name}</p><div class="schedule-grid">`;
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

exports.handler = async (event, context) => {
    try {
        // Ambil parameter gambar dari URL
        const { cover, bg } = event.queryStringParameters || {};
        const coverImage = cover || 'asset/brochure/1.png';
        const backgroundImage = bg || 'asset/brochure/2.png';

        const allData = await getJadwalDataFromCache();
        if (!allData || allData.length === 0) {
            throw new Error('Tidak ada data jadwal yang ditemukan.');
        }

        allData.sort((a, b) => b.doctors.length - a.doctors.length);
        const columns = [[], [], [], []];
        const columnDoctorCounts = [0, 0, 0, 0];
        allData.forEach(spec => {
            let targetColumnIndex = 0;
            let minDoctorsInColumn = columnDoctorCounts[0];
            for (let i = 1; i < columnDoctorCounts.length; i++) {
                if (columnDoctorCounts[i] < minDoctorsInColumn) {
                    minDoctorsInColumn = columnDoctorCounts[i];
                    targetColumnIndex = i;
                }
            }
            columns[targetColumnIndex].push(spec);
            columnDoctorCounts[targetColumnIndex] += spec.doctors.length;
        });

        const [outsideColumn1Data, insideColumn1Data, insideColumn2Data, insideColumn3Data] = columns;
        
        const insideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-inside.html');
        const outsideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-outside.html');
        const [insideTemplate, outsideTemplate] = await Promise.all([
            fs.readFile(insideTemplatePath, 'utf8'),
            fs.readFile(outsideTemplatePath, 'utf8')
        ]);

        const generatedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        const insideHtml = insideTemplate
            .replace('{{COLUMN_1_HTML}}', generateHtmlForDoctors(insideColumn1Data))
            .replace('{{COLUMN_2_HTML}}', generateHtmlForDoctors(insideColumn2Data))
            .replace('{{COLUMN_3_HTML}}', generateHtmlForDoctors(insideColumn3Data))
            .replace('{{GENERATED_DATE}}', generatedDate);

        // Proses semua gambar untuk dijadikan URL atau base64
        const [logoUrl, finalCoverImageUrl, finalBgImageUrl] = await Promise.all([
            imageToUrl('asset/logo/logo.png'),
            imageToUrl(coverImage),
            imageToUrl(backgroundImage)
        ]);
        
        const outsideHtml = outsideTemplate
            .replace('{{COLUMN_1_OUTSIDE}}', generateHtmlForDoctors(outsideColumn1Data))
            .replace('{{LOGO_SILOAM_WARNA}}', logoUrl)
            .replace('{{COVER_IMAGE_SRC}}', finalCoverImageUrl)
            .replace('{{COVER_BACKGROUND_SRC}}', finalBgImageUrl);

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