// netlify/functions/generate-story.js

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const path = require('path');

const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';
const GOOGLE_SCRIPT_CUTI_URL = 'https://script.google.com/macros/s/AKfycbxEp7OwCT0M9Zak1XYeSu4rjkQTjoD-qgh8INEW5btIVVNv15i1DnzI3RUwmLoqG9TtSQ/exec';
const LOCAL_WEBP_IMAGE_PATH = 'asset/webp/'; // Path relatif di dalam folder 'public'

async function fetchData(url) {
    const response = await fetch(`${url}?t=${new Date().getTime()}`);
    if (!response.ok) throw new Error(`Network response error from ${url}`);
    return await response.json();
}

exports.handler = async (event, context) => {
    const { doctors, theme, logo } = event.queryStringParameters;
    
    if (!doctors) {
        return { statusCode: 400, body: 'Error: Parameter "doctors" dibutuhkan.' };
    }
    
    const doctorIds = doctors.split(',');
    const selectedTheme = theme || 'gradient-blue';
    
    // ▼▼▼ PERBAIKAN 1: Menggunakan path file lokal untuk logo ▼▼▼
    // Jika parameter logo tidak ada, gunakan path file lokal, bukan URL.
    const logoPath = logo || `file://${path.resolve(process.cwd(), 'public/asset/logo/logo.png')}`;

    let browser = null;

    try {
        // Ambil data dari Google Sheets
        const [jadwalData, cutiData] = await Promise.all([
            fetchData(GOOGLE_SCRIPT_JADWAL_URL),
            fetchData(GOOGLE_SCRIPT_CUTI_URL)
        ]);

        const allDoctors = [];
        for (const key in jadwalData) {
            jadwalData[key].doctors.forEach(doc => {
                const imageName = doc.image_webp ? doc.image_webp.split(/[\\/]/).pop() : '';
                allDoctors.push({
                    nama: doc.name,
                    spesialis: jadwalData[key].title,
                    // Path fotonya relatif terhadap folder 'public'
                    fotourl: imageName ? LOCAL_WEBP_IMAGE_PATH + encodeURIComponent(imageName) : 'https://placehold.co/200x200/ffffff/cccccc?text=Foto'
                });
            });
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const combinedData = cutiData.map((cuti, index) => {
            const endDateParts = cuti.TanggalSelesaiCuti.split('-');
            if(endDateParts.length !== 3) return null;
            const endDate = new Date(endDateParts[2], endDateParts[1]-1, endDateParts[0]);
            if (endDate < today) return null;
            const doctorDetails = allDoctors.find(d => d.nama.toLowerCase() === cuti.NamaDokter.toLowerCase());
            
            // ▼▼▼ PERBAIKAN 1: Menggunakan path file lokal untuk foto dokter ▼▼▼
            const fotoPath = doctorDetails 
                ? `file://${path.resolve(process.cwd(), 'public', doctorDetails.fotourl)}`
                : 'https://placehold.co/200x200/ffffff/cccccc?text=Foto';

            return {
                id: `doc-${index}`,
                nama: cuti.NamaDokter,
                cutiMulai: cuti.TanggalMulaiCuti,
                cutiSelesai: cuti.TanggalSelesaiCuti,
                spesialis: doctorDetails ? doctorDetails.spesialis : 'Spesialis tidak ditemukan',
                fotourl: fotoPath
            };
        }).filter(Boolean);

        // Luncurkan Puppeteer
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: { width: 1080, height: 1920 },
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        const htmlPath = path.resolve(process.cwd(), 'public/index.html');
        // Kita gunakan networkidle2 agar halaman dasar siap
        await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle2' });

        // Suntikkan data ke halaman
        await page.evaluate((ids, theme, urlLogo, allData) => {
            window.combinedData = allData;
            updateBackground(theme);
            updateStoryPreview(ids);
            document.getElementById('story-logo').src = urlLogo;
        }, doctorIds, selectedTheme, logoPath, combinedData);

        // ▼▼▼ PERBAIKAN 2: Tunggu sampai semua aktivitas jaringan selesai ▼▼▼
        // Ganti waitForTimeout dengan waitForNetworkIdle
        console.log('Waiting for images to load...');
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 });
        console.log('Images loaded, taking screenshot.');

        const previewElement = await page.$('#story-preview');
        const imageBuffer = await previewElement.screenshot({ type: 'png' });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'image/png' },
            body: imageBuffer.toString('base64'),
            isBase64Encoded: true,
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Oops, gagal membuat gambar.', details: error.message }),
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};