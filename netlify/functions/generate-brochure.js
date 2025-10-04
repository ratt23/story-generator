const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// --- URL & KONFIGURASI ---
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';

// --- FUNGSI HELPER ---
async function fetchData(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP ${res.statusCode} untuk ${url}`));
            }
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } 
                catch (e) { reject(new Error(`Gagal parsing JSON: ${e.message}`)); }
            });
        });
        req.on('error', (err) => reject(err));
    });
}

async function getJadwalData() {
    const rawData = await fetchData(GOOGLE_SCRIPT_JADWAL_URL);
    return Object.values(rawData).map(spec => ({
        title: spec.title,
        doctors: spec.doctors.map(doc => ({ name: doc.name, schedule: doc.schedule })),
    }));
}

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

async function fillTemplate(templateHtml, data) {
    const columns = [[], [], []];
    data.forEach((spec, i) => columns[i % 3].push(spec));

    return templateHtml
      .replace('{{COLUMN_1_HTML}}', generateHtmlForDoctors(columns[0]))
      .replace('{{COLUMN_2_HTML}}', generateHtmlForDoctors(columns[1]))
      .replace('{{COLUMN_3_HTML}}', generateHtmlForDoctors(columns[2]));
}


exports.handler = async () => {
    try {
        console.log("--- FUNGSI GENERATE-BROCHURE (LOGIKA HTML) DIMULAI ---");
        
        const allData = await getJadwalData();
        
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

        // Gabungkan kedua HTML menjadi satu dengan pemisah halaman
        const finalHtml = `
            ${insideHtml}
            <div style="page-break-after: always;"></div>
            ${outsideHtml}
        `;

        console.log("--- FUNGSI SELESAI SUKSES, MENGEMBALIKAN HTML ---");

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html' },
            body: finalHtml,
        };
    } catch (error) {
        console.error("!!! ERROR DALAM HANDLER:", error);
        return {
            statusCode: 500,
            body: `<html><body><h1>Error</h1><p>${error.message}</p></body></html>`,
            headers: { 'Content-Type': 'text/html' },
        };
    }
};

