const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
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
        req.setTimeout(20000, () => {
            req.destroy();
            reject(new Error('Request timed out setelah 20 detik'));
        });
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
    let browser = null;
    const startTime = Date.now();
    const logTime = (step) => console.log(`[${(Date.now() - startTime) / 1000}s] ${step}`);

    try {
        logTime("--- FUNGSI GENERATE-BROCHURE (LOGIKA BARU) DIMULAI ---");
        
        const allData = await getJadwalData();
        logTime(`Mengambil data jadwal selesai.`);
        
        const outsideSpecializations = ["Urologi", "Kulit & Kelamin"];
        const outsidePageData = allData.filter(spec => outsideSpecializations.includes(spec.title));
        const insidePageData = allData.filter(spec => !outsideSpecializations.includes(spec.title));

        const insideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-inside.html');
        const outsideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-outside.html');

        const [insideTemplate, outsideTemplate] = await Promise.all([
            fs.readFile(insideTemplatePath, 'utf8'),
            fs.readFile(outsideTemplatePath, 'utf8')
        ]);
        logTime("Membaca file template HTML selesai.");

        const insideHtml = await fillTemplate(insideTemplate, insidePageData);
        const outsideHtml = await fillTemplate(outsideTemplate, outsidePageData);
        logTime("Mengisi template HTML selesai.");

        const finalHtml = `${insideHtml}<div style="page-break-after: always;"></div>${outsideHtml}`;

        logTime("Meluncurkan browser Chromium...");
        browser = await puppeteer.launch({
            args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: await chromium.executablePath(),
            headless: true,
        });
        logTime("Browser berhasil diluncurkan.");

        const page = await browser.newPage();
        
        // --- PERUBAHAN UTAMA UNTUK KECEPATAN ---
        await page.setContent(finalHtml, { waitUntil: 'domcontentloaded' });
        logTime("Set content selesai.");

        logTime("Membuat PDF dari HTML gabungan...");
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '0cm', right: '0cm', bottom: '0cm', left: '0cm' }
        });
        logTime("Pembuatan PDF selesai.");

        logTime("--- FUNGSI SELESAI SUKSES ---");

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/pdf' },
            body: pdfBuffer.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error("!!! ERROR DALAM HANDLER:", error);
        logTime("FUNGSI GAGAL DENGAN ERROR.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Gagal membuat PDF brosur.', message: error.message }),
        };
    } finally {
        if (browser) await browser.close();
        logTime("Browser ditutup.");
    }
};

