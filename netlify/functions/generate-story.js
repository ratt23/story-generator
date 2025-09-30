// netlify/functions/generate-story.js

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// --- HANYA PERLU API CUTI SAJA ---
const GOOGLE_SCRIPT_CUTI_URL = 'https://script.google.com/macros/s/AKfycbxEp7OwCT0M9Zak1XYeSu4rjkQTjoD-qgh8INEW5btIVVNv15i1DnzI3RUwmLoqG9TtSQ/exec';
const LOCAL_WEBP_IMAGE_PATH = 'public/asset/webp/';
const CACHE_DURATION_MS = 5 * 60 * 1000;

// --- MEKANISME CACHING ---
let cachedData = null;
let lastCacheTime = 0;

// --- FUNGSI HELPER ---
function fetchData(url, redirectCount = 0) {
    if (redirectCount > 5) {
        return Promise.reject(new Error('Terlalu banyak redirect.'));
    }
    
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                const redirectUrl = new URL(res.headers.location, url).href;
                return resolve(fetchData(redirectUrl, redirectCount + 1));
            }
            
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (parseError) {
                    reject(new Error(`Gagal parsing JSON: ${parseError.message}`));
                }
            });
        });
        
        req.on('error', (err) => reject(err));
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });
    });
}

async function imageToBase64(filePath) {
    try {
        if (filePath.startsWith('http')) {
            return filePath;
        }

        const absolutePath = path.resolve(process.cwd(), filePath);
        
        try {
            await fs.access(absolutePath);
        } catch {
            console.warn(`File gambar tidak ditemukan: ${absolutePath}`);
            return 'https://placehold.co/200x200/e2e8f0/475569?text=No+Photo';
        }

        const imageBuffer = await fs.readFile(absolutePath);
        const extension = path.extname(filePath).toLowerCase().slice(1);
        const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        
        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        console.error(`Gagal membaca file gambar: ${filePath}`, error);
        return 'https://placehold.co/200x200/e2e8f0/475569?text=Error';
    }
}

function normalizeName(name) {
    return name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    
    return new Date(year, month, day);
}

// --- FUNGSI YANG DISEDERHANAKAN TANPA API JADWAL ---
async function getCutiData() {
    const now = Date.now();
    if (cachedData && (now - lastCacheTime < CACHE_DURATION_MS)) {
        console.log('Menggunakan data cache');
        return cachedData;
    }

    console.log('Mengambil data cuti dari Google Sheets...');
    
    try {
        const cutiData = await fetchData(GOOGLE_SCRIPT_CUTI_URL);

        if (!cutiData || !Array.isArray(cutiData)) {
            throw new Error("Data cuti tidak valid atau kosong");
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const processedData = cutiData
            .filter(cuti => cuti && cuti.NamaDokter && cuti.TanggalSelesaiCuti)
            .map((cuti, index) => {
                const endDate = parseDate(cuti.TanggalSelesaiCuti);
                if (!endDate || endDate < today) return null;

                // Generate photo path from doctor name (lebih sederhana)
                const photoName = `${normalizeName(cuti.NamaDokter)}.webp`;
                const photoPath = path.join(LOCAL_WEBP_IMAGE_PATH, photoName);
                
                return {
                    id: `doc-${index}`,
                    nama: cuti.NamaDokter,
                    cutiMulai: cuti.TanggalMulaiCuti,
                    cutiSelesai: cuti.TanggalSelesaiCuti,
                    spesialis: 'Dokter', // Default value, bisa disesuaikan
                    fotourl: photoPath
                };
            })
            .filter(Boolean);

        cachedData = processedData;
        lastCacheTime = now;
        
        console.log(`Berhasil memuat data ${processedData.length} dokter cuti`);
        return processedData;

    } catch (error) {
        console.error('Error mengambil data cuti:', error);
        if (cachedData) {
            console.log('Menggunakan data cache lama karena error');
            return cachedData;
        }
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
    const isLightTheme = theme === 'solid-white';
    const numDoctors = doctors.length;

    let styles;
    if (numDoctors > 4) {
        styles = {
            container: "w-full flex flex-col items-center justify-center flex-grow space-y-4 px-8",
            item: isLightTheme 
                ? "flex items-center w-full bg-slate-100 rounded-2xl p-4 shadow-lg border border-slate-200" 
                : "flex items-center w-full bg-white/20 rounded-2xl p-4 shadow-lg",
            photo: "w-32 h-32 rounded-full object-cover border-4 flex-shrink-0",
            textContainer: "ml-4 text-left",
            name: "text-3xl font-bold",
            specialty: "text-xl",
            date: "text-xl mt-2"
        };
    } else if (numDoctors > 2) {
        styles = {
            container: "w-full flex flex-col items-center justify-center flex-grow space-y-6 px-10",
            item: isLightTheme 
                ? "flex items-center w-full bg-slate-100 rounded-3xl p-6 shadow-lg border border-slate-200" 
                : "flex items-center w-full bg-white/20 rounded-3xl p-6 shadow-lg",
            photo: "w-40 h-40 rounded-full object-cover border-8 flex-shrink-0",
            textContainer: "ml-6 text-left",
            name: "text-4xl font-bold",
            specialty: "text-2xl",
            date: "text-2xl mt-3"
        };
    } else {
        styles = {
            container: "w-full flex flex-col items-center justify-center flex-grow space-y-8 px-12",
            item: isLightTheme
                ? "flex items-center w-full bg-slate-100 rounded-3xl p-8 shadow-lg border border-slate-200"
                : "flex items-center w-full bg-white/20 rounded-3xl p-8 shadow-lg",
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
                <img src="${doctor.fotourl}" class="${styles.photo}" alt="Foto ${doctor.nama}">
                <div class="${styles.textContainer}">
                    <h3 class="${styles.name}">${doctor.nama}</h3>
                    <p class="${styles.specialty}">${doctor.spesialis}</p>
                    <p class="${styles.date}">Tidak praktek: <strong class="font-semibold">${leaveDatesText}</strong></p>
                </div>
            </div>`;
    }).join('');

    return `<div class="${styles.container}">${doctorsHTML}</div>`;
}

// --- FUNGSI UTAMA ---
exports.handler = async (event) => {
    console.log('Function generate-story dipanggil');
    
    const { doctors, theme, logo } = event.queryStringParameters;
    
    if (!doctors) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Parameter doctors diperlukan' })
        };
    }

    const doctorIds = doctors.split(',');
    const selectedTheme = theme || 'gradient-blue';
    const customLogo = logo || 'public/asset/logo/logo.png';
    
    let browser = null;

    try {
        const allDoctorData = await getCutiData();
        const selectedDoctors = doctorIds
            .map(id => allDoctorData.find(d => d.id === id))
            .filter(Boolean);

        if (selectedDoctors.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Tidak ada dokter yang ditemukan' })
            };
        }

        // Process images
        const doctorsWithProcessedImages = await Promise.all(
            selectedDoctors.map(async (doctor) => {
                const processedPhoto = await imageToBase64(doctor.fotourl);
                return { ...doctor, fotourl: processedPhoto };
            })
        );

        const doctorListContainerHTML = generateDoctorHTML(doctorsWithProcessedImages, selectedTheme);
        const processedLogo = await imageToBase64(customLogo);

        // Load template
        const templatePath = path.resolve(process.cwd(), 'public/story-template.html');
        let htmlContent = await fs.readFile(templatePath, 'utf8');
        
        htmlContent = htmlContent
            .replace('{{THEME_CLASS}}', `theme-${selectedTheme}`)
            .replace('{{LOGO_SRC}}', processedLogo)
            .replace('{{DOCTOR_LIST_HTML}}', doctorListContainerHTML);

        // Generate screenshot
        const browserOptions = {
            args: chromium.args,
            defaultViewport: { width: 1080, height: 1920 },
            executablePath: await chromium.executablePath(),
            headless: true,
        };

        browser = await puppeteer.launch(browserOptions);
        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1920 });
        
        await page.setContent(htmlContent, { 
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Wait for images
        await page.evaluate(async () => {
            const images = Array.from(document.images);
            await Promise.all(images.map(img => {
                if (img.complete) return;
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        const imageBuffer = await page.screenshot({ 
            type: 'png',
            fullPage: false
        });

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
        console.error("Error:", error);
        
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: 'Gagal membuat gambar story',
                message: error.message
            })
        };
    } finally {
        if (browser) {
            await browser.close().catch(console.error);
        }
    }
};