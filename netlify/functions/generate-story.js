// netlify/functions/generate-story.js

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const path = require('path');

// ▼▼▼ TAMBAHKAN URL DAN FUNGSI HELPER DI SINI ▼▼▼
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';
const GOOGLE_SCRIPT_CUTI_URL = 'https://script.google.com/macros/s/AKfycbxEp7OwCT0M9Zak1XYeSu4rjkQTjoD-qgh8INEW5btIVVNv15i1DnzI3RUwmLoqG9TtSQ/exec';
const LOCAL_WEBP_IMAGE_PATH = 'asset/webp/';

async function fetchData(url) {
    // Menggunakan fetch dari Node.js
    const response = await fetch(`${url}?t=${new Date().getTime()}`);
    if (!response.ok) throw new Error(`Network response error from ${url}`);
    return await response.json();
}

function formatFullDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${day} ${months[month]} ${year}`;
}
// ▲▲▲ AKHIR DARI FUNGSI HELPER ▲▲▲


exports.handler = async (event, context) => {
    const { doctors, theme, logo } = event.queryStringParameters;
    
    if (!doctors) {
        return { statusCode: 400, body: 'Error: Parameter "doctors" dibutuhkan.' };
    }
    
    const doctorIds = doctors.split(',');
    const selectedTheme = theme || 'gradient-blue';
    const logoUrl = logo || `https://marcomtools.netlify.app/asset/logo/logo.png`; // Gunakan URL absolut

    let browser = null;

    try {
        // ▼▼▼ LOGIKA PENGAMBILAN DATA SEKARANG DI SINI ▼▼▼
        console.log('Fetching data from Google Sheets...');
        const [jadwalData, cutiData] = await Promise.all([
            fetchData(GOOGLE_SCRIPT_JADWAL_URL),
            fetchData(GOOGLE_SCRIPT_CUTI_URL)
        ]);
        console.log('Data fetched successfully.');

        const allDoctors = [];
        for (const key in jadwalData) {
            jadwalData[key].doctors.forEach(doc => {
                const imageName = doc.image_webp ? doc.image_webp.split(/[\\/]/).pop() : '';
                allDoctors.push({
                    nama: doc.name,
                    spesialis: jadwalData[key].title,
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
            return {
                id: `doc-${index}`,
                nama: cuti.NamaDokter,
                cutiMulai: cuti.TanggalMulaiCuti,
                cutiSelesai: cuti.TanggalSelesaiCuti,
                spesialis: doctorDetails ? doctorDetails.spesialis : 'Spesialis tidak ditemukan',
                fotourl: doctorDetails ? `https://marcomtools.netlify.app/${doctorDetails.fotourl}` : 'https://placehold.co/200x200/ffffff/cccccc?text=Foto'
            };
        }).filter(Boolean);
        // ▲▲▲ AKHIR DARI LOGIKA DATA ▲▲▲

        // Luncurkan Puppeteer
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: { width: 1080, height: 1920 },
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        const htmlPath = path.resolve(process.cwd(), 'public/index.html');
        await page.goto(`file://${htmlPath}`);

        // ▼▼▼ SUNTIKKAN DATA YANG SUDAH JADI KE HALAMAN ▼▼▼
        console.log('Injecting data into the page...');
        await page.evaluate((ids, theme, urlLogo, allData) => {
            // Definisikan ulang combinedData di dalam browser dengan data dari server
            window.combinedData = allData;
            
            // Panggil fungsi global yang sudah ada di index.html
            updateBackground(theme);
            updateStoryPreview(ids);
            
            // Atur logo secara manual
            document.getElementById('story-logo').src = urlLogo;

        }, doctorIds, selectedTheme, logoUrl, combinedData); // Kirim 'combinedData' ke browser
        console.log('Data injected.');

        const previewElement = await page.$('#story-preview');
        await page.waitForTimeout(1000); // Beri waktu 1 detik untuk gambar me-render

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