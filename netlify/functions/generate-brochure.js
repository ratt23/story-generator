const fs = require('fs').promises;
const path = require('path');
const { getStore } = require('@netlify/blobs');

const CACHE_KEY = 'jadwal-dokter-cache';

/**
 * Mengambil data jadwal yang sudah di-cache dari Netlify Blobs.
 * @returns {Promise<object>} Data jadwal yang sudah diproses
 */
async function getJadwalDataFromCache() {
    const jadwalStore = getStore('jadwal-dokter');
    const rawData = await jadwalStore.getJSON(CACHE_KEY);
    
    if (!rawData) {
        throw new Error("Cache jadwal dokter tidak ditemukan. Harap jalankan fungsi 'cache-jadwal-data' terlebih dahulu atau tunggu jadwal berikutnya.");
    }

    // Ubah format data agar sesuai dengan kebutuhan template
    return Object.values(rawData).map(spec => ({
        title: spec.title,
        doctors: spec.doctors.map(doc => ({ name: doc.name, schedule: doc.schedule })),
    }));
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
                if(time) {
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
    const columns = [[], [], []];
    data.forEach((spec, i) => columns[i % 3].push(spec)); // Distribusi data ke 3 kolom
    return templateHtml
      .replace('{{COLUMN_1_HTML}}', generateHtmlForDoctors(columns[0]))
      .replace('{{COLUMN_2_HTML}}', generateHtmlForDoctors(columns[1]))
      .replace('{{COLUMN_3_HTML}}', generateHtmlForDoctors(columns[2]));
}

// Handler utama yang dipanggil oleh pengguna
exports.handler = async () => {
    try {
        const allData = await getJadwalDataFromCache();
        
        const outsideSpecializations = ["Urologi", "Kulit & Kelamin"];
        const outsidePageData = allData.filter(spec => outsideSpecializations.includes(spec.title));
        const insidePageData = allData.filter(spec => !outsideSpecializations.includes(spec.title));

        const insideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-inside.html');
        const outsideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-outside.html');

        const [insideTemplate, outsideTemplate] = await Promise.all([
            fs.readFile(insideTemplatePath, 'utf8'),
            fs.readFile(outsideTemplatePath, 'utf8')
        ]);

        const insideHtml = await fillTemplate(insideTemplate, insidePageData);
        const outsideHtml = await fillTemplate(outsideTemplate, outsidePageData);

        // Gabungkan kedua halaman dengan pemisah halaman untuk dicetak
        const finalHtml = `${insideHtml}<div style="page-break-after: always;"></div>${outsideHtml}`;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html' },
            body: finalHtml,
        };
    } catch (error) {
        console.error("!!! ERROR DALAM HANDLER generate-brochure:", error);
        return {
            statusCode: 500,
            body: `<html><body><h1>Terjadi Kesalahan Server</h1><p>${error.message}</p></body></html>`,
            headers: { 'Content-Type': 'text/html' },
        };
    }
};

