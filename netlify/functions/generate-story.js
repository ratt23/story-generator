// netlify/functions/generate-story.js

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const path = require('path');

// Ini adalah "resep" yang akan dijalankan Netlify setiap kali URL-nya dipanggil
exports.handler = async (event) => {
    // 1. Baca permintaan dari URL (misalnya dokter siapa, tema apa)
    const { doctors, theme } = event.queryStringParameters;
    
    // Jika tidak ada parameter dokter, kirim pesan error
    if (!doctors) {
        return { statusCode: 400, body: 'Error: Kamu perlu memasukkan ID dokter. Contoh: ?doctors=doc-1,doc-2' };
    }
    
    const doctorIds = doctors.split(',');
    const selectedTheme = theme || 'gradient-blue'; // Jika tema tidak disebut, pakai 'gradient-blue'

    let browser = null;

    try {
        // 2. Siapkan dan jalankan "robot browser"
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: { width: 1080, height: 1920 }, // Ukuran Instagram Story
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();

        // 3. Buka file HTML Anda di dalam robot browser
        const htmlPath = path.resolve(process.cwd(), 'public/index.html');
        await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

        // Tunggu sampai halaman selesai memuat data dokter
        await page.waitForSelector('#controls', { visible: true, timeout: 15000 });

        // 4. Perintahkan robot untuk "mengklik" dan mengubah halaman sesuai permintaan
        await page.evaluate((ids, theme) => {
            // "Mencentang" checkbox dokter yang diminta
            ids.forEach(id => {
                const checkbox = document.querySelector(`#${id}`);
                if (checkbox) checkbox.checked = true;
            });
            
            // Mengubah tema
            document.getElementById('background-select').value = theme;
            
            // Jalankan fungsi update yang sudah ada di HTML Anda
            updateBackground(theme);
            updateStoryPreview(ids);
        }, doctorIds, selectedTheme);
        
        // 5. Ambil screenshot dari area preview saja
        const previewElement = await page.$('#story-preview');
        const imageBuffer = await previewElement.screenshot({ type: 'png' });

        // 6. Kirim hasilnya sebagai gambar
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'image/png' },
            body: imageBuffer.toString('base64'),
            isBase64Encoded: true,
        };

    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Oops, gagal membuat gambar.' })};
    } finally {
        // Apapun yang terjadi, tutup browsernya agar tidak boros resource
        if (browser) {
            await browser.close();
        }
    }
};