const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { PDFDocument } = require('pdf-lib');

// --- URL & KONFIGURASI ---
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';

// --- FUNGSI HELPER ---
async function fetchData(url, redirectCount = 0) {
    if (redirectCount > 5) return Promise.reject(new Error('Terlalu banyak redirect.'));
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                const redirectUrl = new URL(res.headers.location, url).href;
                return resolve(fetchData(redirectUrl, redirectCount + 1));
            }
            if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode} untuk ${url}`));
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } 
                catch (parseError) { reject(new Error(`Gagal parsing JSON: ${parseError.message}`)); }
            });
        });
        req.on('error', (err) => reject(err));
        req.setTimeout(20000, () => { // Timeout 20 detik untuk fetch data
            req.destroy();
            reject(new Error('Request timed out setelah 20 detik'));
        });
    });
}

async function getJadwalData() {
    console.log("Mulai mengambil data jadwal dari Google Sheets...");
    const rawData = await fetchData(GOOGLE_SCRIPT_JADWAL_URL);
    const specializations = Object.values(rawData).map(spec => ({
        title: spec.title,
        doctors: spec.doctors.map(doc => ({
            name: doc.name,
            schedule: doc.schedule,
        })),
    }));
    console.log(`Berhasil mengambil data untuk ${specializations.length} spesialisasi.`);
    return specializations;
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
                if(time) { // Hanya tampilkan jika ada jadwal
                    html += `<div class="schedule-day"><strong>${day.slice(0, 3)}:</strong> ${time}</div>`;
                }
            });
            html += `</div></div>`;
        });
        html += `</div>`;
    });
    return html;
}

// FUNGSI INI DIUBAH: Sekarang menerima 'page' bukan 'browser'
async function createPdfPage(page, templateName, data, pageNumber) {
    console.log(`[Langkah ${pageNumber}] Memulai pembuatan halaman PDF dari template: ${templateName}`);
    const templatePath = path.resolve(process.cwd(), 'public', templateName);
    let htmlContent = await fs.readFile(templatePath, 'utf8');
    
    // Membagi data menjadi 3 kolom
    const column1 = [], column2 = [], column3 = [];
    data.forEach((spec, index) => {
        if (index % 3 === 0) column1.push(spec);
        else if (index % 3 === 1) column2.push(spec);
        else column3.push(spec);
    });

    htmlContent = htmlContent
      .replace('{{COLUMN_1_HTML}}', generateHtmlForDoctors(column1))
      .replace('{{COLUMN_2_HTML}}', generateHtmlForDoctors(column2))
      .replace('{{COLUMN_3_HTML}}', generateHtmlForDoctors(column3));

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '0cm', right: '0cm', bottom: '0cm', left: '0cm' }
    });
    console.log(`[Langkah ${pageNumber}] Berhasil membuat halaman PDF dari ${templateName}`);
    return pdfBuffer;
}

exports.handler = async (event) => {
    let browser = null;
    try {
        console.log("--- FUNGSI GENERATE-BROCHURE DIMULAI ---");
        const allData = await getJadwalData();
        if (allData.length === 0) throw new Error("Tidak ada data jadwal yang bisa diambil.");

        const outsideSpecializations = ["Urologi", "Kulit & Kelamin"];
        const outsidePageData = allData.filter(spec => outsideSpecializations.includes(spec.title));
        const insidePageData = allData.filter(spec => !outsideSpecializations.includes(spec.title));

        console.log("[Langkah 1] Meluncurkan browser Chromium...");
        const browserOptions = {
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ],
            executablePath: await chromium.executablePath(),
            headless: true,
            ignoreHTTPSErrors: true,
        };
        browser = await puppeteer.launch(browserOptions);
        console.log("[Langkah 1] Browser berhasil diluncurkan.");

        // PERUBAHAN UTAMA: Buat satu halaman dan gunakan kembali
        const page = await browser.newPage();
        console.log("Halaman browser virtual dibuat.");

        const insidePdfBuffer = await createPdfPage(page, 'brochure-template-inside.html', insidePageData, 2);
        const outsidePdfBuffer = await createPdfPage(page, 'brochure-template-outside.html', outsidePageData, 3);
        
        await page.close();
        console.log("Halaman browser virtual ditutup.");
        
        console.log("[Langkah 4] Memulai penggabungan PDF...");
        const finalPdf = await PDFDocument.create();
        const insideDoc = await PDFDocument.load(insidePdfBuffer);
        const outsideDoc = await PDFDocument.load(outsidePdfBuffer);

        const [insidePage] = await finalPdf.copyPages(insideDoc, [0]);
        const [outsidePage] = await finalPdf.copyPages(outsideDoc, [0]);

        finalPdf.addPage(insidePage);
        finalPdf.addPage(outsidePage);

        const finalPdfBytes = await finalPdf.save();
        console.log("[Langkah 4] PDF berhasil dibuat dan digabungkan.");
        console.log("--- FUNGSI GENERATE-BROCHURE SELESAI SUKSES ---");

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-cache' },
            body: Buffer.from(finalPdfBytes).toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error("!!! ERROR DALAM HANDLER GENERATE-BROCHURE:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Gagal membuat PDF brosur.', message: error.message }),
        };
    } finally {
        if (browser) {
            await browser.close();
            console.log("Browser ditutup.");
        }
    }
};

