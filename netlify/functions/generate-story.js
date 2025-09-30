// netlify/functions/generate-story.js

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

// --- URL & KONFIGURASI ---
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';
const GOOGLE_SCRIPT_CUTI_URL = 'https://script.google.com/macros/s/AKfycbxEp7OwCT0M9Zak1XYeSu4rjkQTjoD-qgh8INEW5btIVVNv15i1DnzI3RUwmLoqG9TtSQ/exec';
const LOCAL_WEBP_IMAGE_PATH = 'public/asset/webp/';
const CACHE_DURATION_MS = 5 * 60 * 1000;

// --- MEKANISME CACHING ---
let cachedData = null;
let lastCacheTime = 0;

// --- FUNGSI HELPER ---
function fetchData(url, redirectCount = 0) {
    if (redirectCount > 5) return Promise.reject(new Error('Terlalu banyak redirect.'));
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return resolve(fetchData(res.headers.location, redirectCount + 1));
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`StatusCode=${res.statusCode}`));
            }
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', (err) => reject(err));
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });
    });
}

function imageToBase64(filePath) {
    try {
        const absolutePath = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(absolutePath)) {
            console.warn(`File gambar tidak ditemukan di: ${absolutePath}`);
            return 'https://placehold.co/200x200/e2e8f0/475569?text=NotFound';
        }
        const imageBuffer = fs.readFileSync(absolutePath);
        const extension = path.extname(filePath).slice(1);
        return `data:image/${extension};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        console.error(`Gagal membaca file gambar: ${filePath}`, error);
        return 'https://placehold.co/200x200/e2e8f0/475569?text=Error';
    }
}

async function getCombinedDoctorData() {
    const now = Date.now();
    if (cachedData && (now - lastCacheTime < CACHE_DURATION_MS)) return cachedData;
    const [jadwalData, cutiData] = await Promise.all([
        fetchData(GOOGLE_SCRIPT_JADWAL_URL),
        fetchData(GOOGLE_SCRIPT_CUTI_URL)
    ]);
    if (!jadwalData || !cutiData) throw new Error("Gagal mengambil data Google Sheets.");
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
            fotourl: doctorDetails?.fotourl || ''
        };
    }).filter(Boolean);
    cachedData = combinedData;
    lastCacheTime = now;
    return combinedData;
}

// --- FUNGSI UTAMA (HANDLER) ---
exports.handler = async (event) => {
    const { doctors, theme } = event.queryStringParameters;
    if (!doctors) return { statusCode: 400, body: 'Error: Anda perlu memasukkan ID dokter.' };
    
    const doctorIds = doctors.split(',');
    const selectedTheme = theme || 'gradient-blue';
    let browser = null;

    try {
        const allDoctorData = await getCombinedDoctorData();
        const selectedDoctors = doctorIds.map(id => allDoctorData.find(d => d.id === id)).filter(Boolean);
        if (selectedDoctors.length === 0) return { statusCode: 404, body: 'Error: Dokter tidak ditemukan.' };

        // --- LOGIKA BARU UNTUK TEMA TERANG/GELAP ---
        const lightThemes = ['solid-white']; // Daftar tema yang dianggap "terang"
        const isLightTheme = lightThemes.includes(selectedTheme);
        
        const numDoctors = selectedDoctors.length;
        
        let containerClass, itemClass, photoClass, textContainerClass, nameClass, specialtyClass, dateClass;

        // Atur style berdasarkan jumlah dokter
        if (numDoctors > 4) { // Untuk 5+ dokter
            containerClass = "w-full flex flex-col items-center justify-center flex-grow space-y-4 px-8";
            photoClass = "w-32 h-32 rounded-full object-cover border-4 flex-shrink-0";
            textContainerClass = "ml-4 text-left";
            nameClass = "text-3xl font-bold";
            specialtyClass = "text-xl";
            dateClass = "text-xl mt-2";
            itemClass = isLightTheme 
                ? "flex items-center w-full bg-slate-100 rounded-2xl p-4 shadow-lg border border-slate-200" 
                : "flex items-center w-full bg-white/20 rounded-2xl p-4 shadow-lg";
        } else if (numDoctors > 2) { // Untuk 3-4 dokter
            containerClass = "w-full flex flex-col items-center justify-center flex-grow space-y-6 px-10";
            photoClass = "w-40 h-40 rounded-full object-cover border-8 flex-shrink-0";
            textContainerClass = "ml-6 text-left";
            nameClass = "text-4xl font-bold";
            specialtyClass = "text-2xl";
            dateClass = "text-2xl mt-3";
            itemClass = isLightTheme 
                ? "flex items-center w-full bg-slate-100 rounded-3xl p-6 shadow-lg border border-slate-200" 
                : "flex items-center w-full bg-white/20 rounded-3xl p-6 shadow-lg";
        } else { // Untuk 1-2 dokter
            containerClass = "w-full flex flex-col items-center justify-center flex-grow space-y-8 px-12";
            photoClass = "w-48 h-48 rounded-full object-cover border-8 flex-shrink-0";
            textContainerClass = "ml-8 text-left";
            nameClass = "text-5xl font-bold";
            specialtyClass = "text-3xl";
            dateClass = "text-3xl mt-4";
            itemClass = isLightTheme
                ? "flex items-center w-full bg-slate-100 rounded-3xl p-8 shadow-lg border border-slate-200"
                : "flex items-center w-full bg-white/20 rounded-3xl p-8 shadow-lg";
        }
        
        // Atur warna border foto dan warna teks berdasarkan tema
        if (isLightTheme) {
            photoClass += " border-white shadow-md";
            nameClass += " text-slate-800"; // Teks nama dokter menjadi abu tua/biru navy
            specialtyClass += " text-slate-600"; // Teks spesialis sedikit lebih terang
            dateClass += " text-slate-600"; // Teks tanggal juga
        } else {
            photoClass += " border-white";
            specialtyClass += " opacity-90"; // Efek opacity untuk tema gelap
            // Untuk tema gelap, warna teks tidak perlu ditambahkan karena akan mewarisi warna putih dari container
        }
        // --- AKHIR LOGIKA BARU ---

        const formatFullDate = (dateStr) => {
            if (!dateStr) return '';
            const [day, month, year] = dateStr.split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
            return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
        };

        const doctorsHTML = selectedDoctors.map(doctor => {
            const leaveDatesText = (doctor.cutiMulai === doctor.cutiSelesai) 
                ? formatFullDate(doctor.cutiMulai) 
                : `${formatFullDate(doctor.cutiMulai)} - ${formatFullDate(doctor.cutiSelesai)}`;
            const photoSrc = doctor.fotourl ? imageToBase64(doctor.fotourl) : 'https://placehold.co/200x200/e2e8f0/475569?text=No+Photo';
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
        const templatePath = path.resolve(process.cwd(), 'public/story-template.html');
        let htmlContent = fs.readFileSync(templatePath, 'utf8')
            .replace('{{THEME_CLASS}}', `theme-${selectedTheme}`)
            .replace('{{LOGO_SRC}}', imageToBase64('public/asset/logo/logo.png'))
            .replace('{{DOCTOR_LIST_HTML}}', doctorListContainerHTML);

        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: { width: 1080, height: 1920 },
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const imageBuffer = await page.screenshot({ type: 'png' });

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
        if (browser) await browser.close();
    }
};