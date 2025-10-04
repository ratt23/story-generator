// netlify/functions/generate-brochure.js

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { PDFDocument } = require('pdf-lib'); // Pustaka penggabung PDF

// --- KONFIGURASI & ASET BASE64 ---
const GOOGLE_SCRIPT_JADWAL_URL = '...';
const LOGO_SILOAM_PUTIH_B64 = 'data:image/png;base64,...';
// ... (aset base64 lainnya)

// --- FUNGSI HELPER (fetchData, getGroupedDoctorData, dll) ---
// ...

// Fungsi baru untuk membuat halaman PDF dari template
async function createPdfPage(browser, templateName, data) {
    const templatePath = path.resolve(process.cwd(), `public/${templateName}`);
    let htmlContent = await fs.readFile(templatePath, 'utf8');
    for (const key in data) {
        htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    }
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
    await page.close();
    return pdfBuffer;
}

// --- HANDLER UTAMA ---
exports.handler = async () => {
    let browser = null;
    try {
        // 1. Ambil & proses data
        const allData = await getGroupedDoctorData();
        // ... (logika pemisahan data untuk halaman dalam dan luar)

        // 2. Siapkan data untuk di-inject
        const insidePageData = { /*...*/ };
        const outsidePageData = { /*...*/ };

        // 3. Jalankan Puppeteer
        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });

        // 4. Buat kedua PDF secara terpisah
        const insidePdfBuffer = await createPdfPage(browser, 'brochure-template-inside.html', insidePageData);
        const outsidePdfBuffer = await createPdfPage(browser, 'brochure-template-outside.html', outsidePageData);

        // 5. Gabungkan PDF
        const finalPdfDoc = await PDFDocument.create();
        const insidePage = await PDFDocument.load(insidePdfBuffer);
        const outsidePage = await PDFDocument.load(outsidePdfBuffer);
        const [copiedInsidePage] = await finalPdfDoc.copyPages(insidePage, [0]);
        const [copiedOutsidePage] = await finalPdfDoc.copyPages(outsidePage, [0]);
        finalPdfDoc.addPage(copiedInsidePage);
        finalPdfDoc.addPage(copiedOutsidePage);
        const finalPdfBytes = await finalPdfDoc.save();
        
        // 6. Kembalikan hasil ke pengguna
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/pdf' },
            body: Buffer.from(finalPdfBytes).toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        // ... (Error handling)
    } finally {
        if (browser) await browser.close();
    }
};
