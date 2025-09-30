// netlify/functions/generate-story.js

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

// --- URL & KONFIGURASI ---
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';
const GOOGLE_SCRIPT_CUTI_URL = 'https://script.google.com/macros/s/AKfycbxEp7OwCT0M9Zak1XYeSu4rjkQTjoD-qgh8INEW5btIVVNv15i1DnzI3RUwmLoqG9TtSQ/exec';
const LOCAL_WEBP_IMAGE_PATH = 'public/asset/webp/'; // Path relatif dari root proyek
const CACHE_DURATION_MS = 5 * 60 * 1000; // Cache data selama 5 menit

// --- MEKANISME CACHING SEDERHANA ---
let cachedData = null;
let lastCacheTime = 0;

// --- FUNGSI HELPER ---

// Helper untuk fetch data dengan timeout
function fetchData(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`StatusCode=${res.statusCode}`));
            }
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', (err) => reject(err));
        req.setTimeout(10000, () => { // Timeout 10 detik
            req.destroy();
            reject(new Error('Request timed out'));
        });
    });
}


// Mengubah gambar lokal menjadi Base64
function imageToBase64(filePath) {
    try {
        const absolutePath = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(absolutePath)) {
            console.warn(`File gambar tidak ditemukan di: ${absolutePath}`);
            return 'https://placehold.co/200x200/ffffff/cccccc?text=NotFound';
        }
        const imageBuffer = fs.readFileSync(absolutePath);
        const extension = path.extname(filePath).slice(1);
        return `data:image/${extension};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        console.error(`Gagal membaca file gambar: ${filePath}`, error);
        return 'https://placehold.co/200x200/ffffff/cccccc?text=Error';
    }
}

// Mengambil dan memproses data dokter (dengan cache)
async function getCombinedDoctorData() {
    const now = Date.now();
    if (cachedData && (now - lastCacheTime < CACHE_DURATION_MS)) {
        console.log("Menggunakan data dari cache.");
        return cachedData;
    }

    console.log("Mengambil data baru dari Google Sheets...");
    const [jadwalData, cutiData] = await Promise.all([
        fetchData(GOOGLE_SCRIPT_JADWAL_URL),
        fetchData(GOOGLE_SCRIPT_CUTI_URL)
    ]);

    if (!jadwalData || !cutiData) {
        throw new Error("Gagal mengambil data dari satu atau lebih sumber Google Sheets.");
    }
    
    const allDoctors = [];
    for (const key in jadwalData) {
        jadwalData[key].doctors.forEach(doc => {
            const imageName = doc.image_webp ? doc.image_webp.split(/[\\/]/).pop() : '';
            allDoctors.push({
                nama: doc.name,
                spesialis: jadwalData[key].title,
                fotourl: imageName ? path.join(LOCAL_WEBP_IMAGE_PATH, imageName) : ''
            });
        });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const combinedData = cutiData.map((cuti, index) => {
        const endDateParts = cuti.TanggalSelesaiCuti.split('-');
        if (endDateParts.length !== 3) return null;
        
        const endDate = new Date(endDateParts[2], endDateParts[1] - 1, endDateParts[0]);
        if (endDate < today) return null;
        
        const doctorDetails = allDoctors.find(d => d.nama.toLowerCase() === cuti.NamaDokter.toLowerCase());
        return {
            id: `doc-${index}`,
            nama: cuti.NamaDokter,
            cutiMulai: cuti.TanggalMulaiCuti,
            cutiSelesai: cuti.TanggalSelesaiCuti,
            spesialis: doctorDetails ? doctorDetails.spesialis : 'Spesialis tidak ditemukan',
            fotourl: doctorDetails && doctorDetails.fotourl ? doctorDetails.fotourl : 'https://placehold.co/200x200/ffffff/cccccc?text=Foto'
        };
    }).filter(Boolean);

    cachedData = combinedData;
    lastCacheTime = now;
    return combinedData;
}

// --- FUNGSI UTAMA (HANDLER) ---
exports.handler = async (event) => {
    const { doctors, theme, logo } = event.queryStringParameters;

    if (!doctors) {
        return { statusCode: 400, body: 'Error: Anda perlu memasukkan ID dokter. Contoh: ?doctors=doc-1,doc-2' };
    }

    const doctorIds = doctors.split(',');
    const selectedTheme = theme || 'gradient-blue';
    const logoUrl = logo || 'public/asset/logo/logo.png'; // Path default jika tidak disediakan

    let browser = null;

    try {
        // 1. Ambil semua data dokter (cepat karena ada cache)
        const allDoctorData = await getCombinedDoctorData();
        const selectedDoctors = doctorIds.map(id => allDoctorData.find(d => d.id === id)).filter(Boolean);

        if (selectedDoctors.length === 0) {
            return { statusCode: 404, body: 'Error: Dokter dengan ID tersebut tidak ditemukan atau tidak sedang cuti.' };
        }

        // 2. Buat markup HTML untuk daftar dokter
        const numDoctors = selectedDoctors.length;
        let containerClass = "w-full flex flex-col items-center justify-center flex-grow space-y-8 px-12";
        let itemClass = "flex items-center w-full bg-white/20 rounded-3xl p-8 shadow-lg";
        let photoClass = "w-48 h-48 rounded-full object-cover border-8 border-white flex-shrink-0";
        let textContainerClass = "ml-8 text-left";
        let nameClass = "text-5xl font-bold";
        let specialtyClass = "text-3xl opacity-90 mt-1";
        let dateClass = "text-3xl mt-4";

        if (numDoctors > 2) {
            containerClass = "w-full flex flex-col items-center justify-center flex-grow space-y-6 px-10";
            itemClass = "flex items-center w-full bg-white/20 rounded-3xl p-6 shadow-lg";
            photoClass = "w-40 h-40 rounded-full object-cover border-8 border-white flex-shrink-0";
            textContainerClass = "ml-6 text-left";
            nameClass = "text-4xl font-bold";
            specialtyClass = "text-2xl opacity-90 mt-1";
            dateClass = "text-2xl mt-3";
        }
        if (numDoctors > 4) {
            containerClass = "w-full flex flex-col items-center justify-center flex-grow space-y-4 px-8";
            itemClass = "flex items-center w-full bg-white/20 rounded-2xl p-4 shadow-lg";
            photoClass = "w-32 h-32 rounded-full object-cover border-4 border-white flex-shrink-0";
            textContainerClass = "ml-4 text-left";
            nameClass = "text-3xl font-bold";
            specialtyClass = "text-xl opacity-90";
            dateClass = "text-xl mt-2";
        }
        
        const formatFullDate = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            const [day, month, year] = parts;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
            return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
        };

        const doctorsHTML = selectedDoctors.map(doctor => {
            const startDate = formatFullDate(doctor.cutiMulai);
            const endDate = formatFullDate(doctor.cutiSelesai);
            const leaveDatesText = (startDate === endDate) ? startDate : `${startDate} - ${endDate}`;
            // Ubah path gambar menjadi Base64
            const photoSrc = doctor.fotourl.startsWith('http') ? doctor.fotourl : imageToBase64(doctor.fotourl);

            return `
                <div class="${itemClass}">
                    <img src="${photoSrc}" class="${photoClass}" alt="Foto ${doctor.nama}">
                    <div class="${textContainerClass}">
                        <h3 class="${nameClass}">${doctor.nama}</h3>
                        <p class="${specialtyClass}">${doctor.spesialis}</p>
                        <p class="${dateClass}">Tidak praktek: <strong class="font-semibold">${leaveDatesText}</strong></p>
                    </div>
                </div>`;
        }).join('');
        
        const doctorListContainerHTML = `<div class="${containerClass}">${doctorsHTML}</div>`;

        // 3. Baca template HTML dan masukkan data
        const templatePath = path.resolve(process.cwd(), 'public/story-template.html');
        let htmlContent = fs.readFileSync(templatePath, 'utf8');
        
        const logoSrc = logoUrl.startsWith('http') ? logoUrl : imageToBase64(logoUrl);

        htmlContent = htmlContent
            .replace('{{THEME_CLASS}}', `theme-${selectedTheme}`)
            .replace('{{LOGO_SRC}}', logoSrc)
            .replace('{{DOCTOR_LIST_HTML}}', doctorListContainerHTML);

        // 4. Jalankan browser dan render HTML yang sudah jadi
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: { width: 1080, height: 1920 },
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        // Gunakan setContent, ini jauh lebih cepat!
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' }); // networkidle0 aman di sini karena semua aset sudah di-embed

        // 5. Ambil screenshot
        const imageBuffer = await page.screenshot({ type: 'png' });

        // 6. Kirim hasilnya sebagai gambar
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'image/png' },
            body: imageBuffer.toString('base64'),
            isBase64Encoded: true,
        };

    } catch (error) {
        console.error("Error dalam handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Oops, gagal membuat gambar.', details: error.message })};
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};