// netlify/functions/generate-story.js

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// --- URL & KONFIGURASI ---
const GOOGLE_SCRIPT_JADWAL_URL = 'https://script.google.com/macros/s/AKfycbw6Fz5vI992Xya34JAkwMRY4oD1opCoBiWTQpPoTNSe9F_b5IdbI-ydtNix2AOj0IgyDg/exec';
const GOOGLE_SCRIPT_CUTI_URL = 'https://script.google.com/macros/s/AKfycbxEp7OwCT0M9Zak1XYeSu4rjkQTjoD-qgh8INEW5btIVVNv15i1DnzI3RUwmLoqG9TtSQ/exec';
const LOCAL_WEBP_IMAGE_DIR = 'public/asset/webp/';
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
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timed out setelah 30 detik'));
        });
    });
}

function createDoctorSlug(doctorName) {
    if (!doctorName) return '';
    return doctorName.toLowerCase()
        .replace(/\b(dr|drg)\b\.?\s*/g, '')
        .replace(/\bsp\.[a-z]+\b/gi, '')
        .replace(/\bm\.[a-z]+\b/gi, '')
        .replace(/\bsubsp\.[a-z]+\b/gi, '')
        .replace(/[.,()]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// PERBAIKAN: Fungsi untuk mendapatkan URL gambar yang benar
async function getImageUrl(doctorName, imageFromSheet = null) {
    // Coba dari image_webp di sheet terlebih dahulu
    if (imageFromSheet) {
        const imageName = path.basename(imageFromSheet);
        const localPath = path.join(LOCAL_WEBP_IMAGE_DIR, imageName);
        if (await fileExists(localPath)) {
            // Convert ke base64 untuk local file
            try {
                const imageBuffer = await fs.readFile(localPath);
                const mimeType = 'image/webp';
                return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
            } catch (error) {
                console.warn(`Gagal membaca file lokal: ${localPath}`, error);
            }
        }
    }

    // Fallback: coba berdasarkan slug nama dokter
    const doctorSlug = createDoctorSlug(doctorName);
    const slugPath = path.join(LOCAL_WEBP_IMAGE_DIR, `${doctorSlug}.webp`);
    
    if (await fileExists(slugPath)) {
        try {
            const imageBuffer = await fs.readFile(slugPath);
            const mimeType = 'image/webp';
            return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        } catch (error) {
            console.warn(`Gagal membaca file slug: ${slugPath}`, error);
        }
    }

    // Fallback terakhir: placeholder
    return 'https://placehold.co/200x200/e2e8f0/475569?text=No+Photo';
}

function normalizeName(name) {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(p => parseInt(p, 10));
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month - 1, day);
}

async function getCombinedDoctorData() {
    const now = Date.now();
    if (cachedData && (now - lastCacheTime < CACHE_DURATION_MS)) {
        console.log('Menggunakan data cache');
        return cachedData;
    }

    console.log('Mengambil data terbaru dari Google Sheets...');
    
    try {
        const [jadwalData, cutiData] = await Promise.all([
            fetchData(GOOGLE_SCRIPT_JADWAL_URL),
            fetchData(GOOGLE_SCRIPT_CUTI_URL)
        ]);
        if (!jadwalData || !cutiData) throw new Error("Gagal mengambil data dari Google Sheets.");

        const doctorMap = new Map();
        
        // Build doctor map from jadwal data
        for (const key in jadwalData) {
            if (jadwalData[key] && Array.isArray(jadwalData[key].doctors)) {
                for (const doc of jadwalData[key].doctors) {
                    if (doc && doc.name) {
                        const imageUrl = await getImageUrl(doc.name, doc.image_webp);
                        
                        doctorMap.set(normalizeName(doc.name), {
                            nama: doc.name,
                            spesialis: jadwalData[key].title || 'Spesialis tidak diketahui',
                            fotourl: imageUrl
                        });
                    }
                }
            }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const combinedData = cutiData
            .filter(cuti => cuti && cuti.NamaDokter && cuti.TanggalSelesaiCuti)
            .map((cuti, index) => {
                const endDate = parseDate(cuti.TanggalSelesaiCuti);
                if (!endDate || endDate < today) return null;
                
                const doctorDetails = doctorMap.get(normalizeName(cuti.NamaDokter));
                
                return {
                    id: `doc-${index}`,
                    nama: cuti.NamaDokter,
                    cutiMulai: cuti.TanggalMulaiCuti,
                    cutiSelesai: cuti.TanggalSelesaiCuti,
                    spesialis: doctorDetails ? doctorDetails.spesialis : 'Spesialis tidak ditemukan',
                    fotourl: doctorDetails ? doctorDetails.fotourl : 'https://placehold.co/200x200/e2e8f0/475569?text=No+Photo'
                };
            })
            .filter(Boolean);

        cachedData = combinedData;
        lastCacheTime = now;
        console.log(`Berhasil memuat data ${combinedData.length} dokter`);
        return combinedData;
    } catch (error) {
        console.error('Error dalam getCombinedDoctorData:', error);
        if (cachedData) return cachedData;
        throw error;
    }
}

function formatFullDate(dateStr) {
    if (!dateStr) return 'Tanggal tidak tersedia';
    
    const date = parseDate(dateStr);
    if (!date) return 'Format tanggal invalid';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
}

function generateDoctorHTML(doctors, theme) {
    const isLightTheme = theme === 'solid-white' || theme === 'solid-white-dots';
    const numDoctors = doctors.length;

    let styles;
    if (numDoctors > 4) { // 5+ dokter
        styles = { 
            container: "w-full flex flex-col items-center justify-center flex-grow space-y-4 px-8", 
            item: isLightTheme ? "flex items-center w-full bg-slate-100 rounded-2xl p-4 shadow-lg border border-slate-200" : "flex items-center w-full bg-white/20 rounded-2xl p-4 shadow-lg", 
            photo: "w-32 h-32 rounded-full object-cover border-4 flex-shrink-0", 
            textContainer: "ml-4 text-left", 
            name: "text-3xl font-bold", 
            specialty: "text-xl", 
            date: "text-xl mt-2" 
        };
    } else if (numDoctors > 2) { // 3-4 dokter
        styles = { 
            container: "w-full flex flex-col items-center justify-center flex-grow space-y-6 px-10", 
            item: isLightTheme ? "flex items-center w-full bg-slate-100 rounded-3xl p-6 shadow-lg border border-slate-200" : "flex items-center w-full bg-white/20 rounded-3xl p-6 shadow-lg", 
            photo: "w-40 h-40 rounded-full object-cover border-8 flex-shrink-0", 
            textContainer: "ml-6 text-left", 
            name: "text-4xl font-bold", 
            specialty: "text-2xl", 
            date: "text-2xl mt-3" 
        };
    } else { // 1-2 dokter
        styles = { 
            container: "w-full flex flex-col items-center justify-center flex-grow space-y-8 px-12", 
            item: isLightTheme ? "flex items-center w-full bg-slate-100 rounded-3xl p-8 shadow-lg border border-slate-200" : "flex items-center w-full bg-white/20 rounded-3xl p-8 shadow-lg", 
            photo: "w-48 h-48 rounded-full object-cover border-8 flex-shrink-0", 
            textContainer: "ml-8 text-left", 
            name: "text-5xl font-bold", 
            specialty: "text-3xl", 
            date: "text-3xl mt-4" 
        };
    }

    if (isLightTheme) {
        styles.photo += " border-white shadow-md"; 
        styles.name += " text-slate-800"; 
        styles.specialty += " text-slate-600"; 
        styles.date += " text-slate-600";
    } else {
        styles.photo += " border-white"; 
        styles.specialty += " opacity-90";
    }

    const doctorsHTML = doctors.map(doctor => {
        const leaveDatesText = (doctor.cutiMulai === doctor.cutiSelesai) 
            ? formatFullDate(doctor.cutiMulai) 
            : `${formatFullDate(doctor.cutiMulai)} - ${formatFullDate(doctor.cutiSelesai)}`;

        return `
            <div class="${styles.item}">
                <img src="${doctor.fotourl}" class="${styles.photo}" alt="Foto ${doctor.nama}" onerror="this.src='https://placehold.co/200x200/e2e8f0/475569?text=Photo+Error'">
                <div class="${styles.textContainer}">
                    <h3 class="${styles.name}">${doctor.nama}</h3>
                    <p class="${styles.specialty}">${doctor.spesialis}</p>
                    <p class="${styles.date}">Tidak praktek: <strong class="font-semibold">${leaveDatesText}</strong></p>
                </div>
            </div>`;
    }).join('');

    return `<div class="${styles.container}">${doctorsHTML}</div>`;
}

// PERBAIKAN: Fungsi untuk mendapatkan logo
async function getLogoUrl(logoParam) {
    if (logoParam) {
        // Jika logo dari parameter, coba sebagai path lokal terlebih dahulu
        try {
            const logoPath = path.resolve(process.cwd(), logoParam);
            if (await fileExists(logoPath)) {
                const imageBuffer = await fs.readFile(logoPath);
                const mimeType = 'image/png';
                return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
            }
        } catch (error) {
            console.warn(`Gagal membaca logo dari path: ${logoParam}`, error);
        }
        // Jika bukan path lokal, gunakan sebagai URL
        return logoParam;
    }
    
    // Default logo
    const defaultLogoPath = path.resolve(process.cwd(), 'public/asset/logo/logo.png');
    if (await fileExists(defaultLogoPath)) {
        try {
            const imageBuffer = await fs.readFile(defaultLogoPath);
            const mimeType = 'image/png';
            return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        } catch (error) {
            console.warn('Gagal membaca logo default', error);
        }
    }
    
    return 'https://placehold.co/200x100/e2e8f0/475569?text=Logo+Not+Found';
}

exports.handler = async (event) => {
    console.log('Function generate-story dipanggil');
    const { doctors, theme, logo } = event.queryStringParameters;
    
    if (!doctors) {
        return { 
            statusCode: 400, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Parameter doctors diperlukan' }) 
        };
    }

    const doctorIds = doctors.split(',');
    const selectedTheme = theme || 'gradient-blue';
    let browser = null;

    try {
        const validThemes = ['gradient-blue', 'gradient-purple', 'gradient-orange', 'solid-white', 'solid-white-dots'];
        if (!validThemes.includes(selectedTheme)) {
            return { 
                statusCode: 400, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Tema tidak valid' }) 
            };
        }

        const allDoctorData = await getCombinedDoctorData();
        const selectedDoctors = doctorIds.map(id => allDoctorData.find(d => d.id === id)).filter(Boolean);

        if (selectedDoctors.length === 0) {
            return { 
                statusCode: 404, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Tidak ada dokter yang ditemukan dengan ID tersebut' }) 
            };
        }

        console.log(`Memproses ${selectedDoctors.length} dokter:`, selectedDoctors.map(d => d.nama));

        // Process logo
        const logoUrl = await getLogoUrl(logo);

        const doctorListContainerHTML = generateDoctorHTML(selectedDoctors, selectedTheme);

        // Baca template
        const templatePath = path.resolve(process.cwd(), 'public/story-template.html');
        let htmlContent = await fs.readFile(templatePath, 'utf8');
        
        // Replace placeholder dengan data aktual
        htmlContent = htmlContent
            .replace('{{THEME_CLASS}}', `theme-${selectedTheme}`)
            .replace('{{LOGO_SRC}}', logoUrl)
            .replace('{{DOCTOR_LIST_HTML}}', doctorListContainerHTML);

        // Setup browser untuk screenshot
        const browserOptions = {
            args: chromium.args,
            defaultViewport: { width: 1080, height: 1920 },
            executablePath: await chromium.executablePath(),
            headless: true
        };

        browser = await puppeteer.launch(browserOptions);
        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1920 });
        
        // Set content dan tunggu gambar load
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Tunggu semua gambar selesai load
        await page.evaluate(async () => {
            const images = Array.from(document.images);
            await Promise.all(images.map(img => {
                if (img.complete) return;
                return new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Jangan reject jika gambar error
                });
            }));
        });
        
        // Tunggu tambahan untuk memastikan render selesai
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Ambil screenshot
        const imageBuffer = await page.screenshot({ 
            type: 'png', 
            fullPage: false 
        });
        
        console.log('Screenshot berhasil dibuat');

        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'image/png', 
                'Cache-Control': 'public, max-age=300' 
            },
            body: imageBuffer.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error("Error dalam handler:", error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: 'Gagal membuat gambar story', 
                message: error.message, 
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined 
            })
        };
    } finally {
        if (browser) {
            try { 
                await browser.close(); 
                console.log('Browser closed'); 
            } catch (closeError) { 
                console.error('Error closing browser:', closeError); 
            }
        }
    }
};