const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// === KONFIGURASI DASAR ===
const GOOGLE_SCRIPT_JADWAL_URL = 'https://dashboarddev.netlify.app/.netlify/functions/getDoctors';
const GOOGLE_SCRIPT_CUTI_URL = 'https://dashboarddev.netlify.app/.netlify/functions/getLeaveData';
const CACHE_DURATION_MS = 5 * 60 * 1000;

// === CACHING DATA ===
let cachedData = null;
let lastCacheTime = 0;

// === HELPER FUNCTIONS ===
function fetchData(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Terlalu banyak redirect.'));
  const urlWithCacheBust = new URL(url);
  urlWithCacheBust.searchParams.append('t', new Date().getTime());

  return new Promise((resolve, reject) => {
    const req = https.get(urlWithCacheBust.href, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = new URL(res.headers.location, url).href;
        return resolve(fetchData(redirectUrl, redirectCount + 1));
      }
      if (res.statusCode < 200 || res.statusCode >= 300)
        return reject(new Error(`HTTP ${res.statusCode} untuk ${url}`));

      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (parseError) {
          reject(new Error(`Gagal parsing JSON: ${parseError.message}`));
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timed out setelah 30 detik'));
    });
  });
}

function normalizeName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map((p) => parseInt(p, 10));
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

async function getCombinedDoctorData() {
  const now = Date.now();
  if (cachedData && now - lastCacheTime < CACHE_DURATION_MS) {
    console.log('✅ Menggunakan data cache');
    return cachedData;
  }

  console.log('🔄 Mengambil data terbaru dari API Netlify...');
  try {
    const [jadwalData, cutiData] = await Promise.all([
      fetchData(GOOGLE_SCRIPT_JADWAL_URL),
      fetchData(GOOGLE_SCRIPT_CUTI_URL),
    ]);

    if (!jadwalData || !cutiData) throw new Error('Gagal mengambil data dari API.');

    const doctorMap = new Map();
    for (const key in jadwalData) {
      if (jadwalData[key] && Array.isArray(jadwalData[key].doctors)) {
        for (const doc of jadwalData[key].doctors) {
          if (doc && doc.name) {
            const imageUrl = doc.image_url || 'https://placehold.co/200x200/e2e8f0/475569?text=No+Photo';
            doctorMap.set(normalizeName(doc.name), {
              nama: doc.name,
              spesialis: jadwalData[key].title || 'Spesialis tidak diketahui',
              fotourl: imageUrl,
            });
          }
        }
      }
    }

    const combinedData = cutiData
      .filter((cuti) => cuti && cuti.NamaDokter && cuti.TanggalSelesaiCuti)
      .map((cuti, index) => {
        const doctorDetails = doctorMap.get(normalizeName(cuti.NamaDokter));
        return {
          id: `doc-${index}`,
          nama: cuti.NamaDokter,
          cutiMulai: cuti.TanggalMulaiCuti,
          cutiSelesai: cuti.TanggalSelesaiCuti,
          spesialis: doctorDetails ? doctorDetails.spesialis : 'N/A',
          fotourl: doctorDetails ? doctorDetails.fotourl : 'https://placehold.co/200x200/e2e8f0/475569?text=No+Photo',
        };
      })
      .filter(Boolean);

    cachedData = combinedData;
    lastCacheTime = now;
    console.log(`✅ Berhasil memuat ${combinedData.length} dokter`);
    return combinedData;
  } catch (error) {
    console.error('❌ Error getCombinedDoctorData:', error);
    if (cachedData) return cachedData;
    throw error;
  }
}

function formatFullDate(dateStr) {
  if (!dateStr) return 'Tanggal tidak tersedia';
  const date = parseDate(dateStr);
  if (!date) return 'Format tanggal invalid';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
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

async function getLogoUrl(logoParam) {
  if (logoParam && logoParam.startsWith('http')) {
    return logoParam;
  }
  
  const defaultLogoPath = path.resolve(process.cwd(), 'public/asset/logo/logo.png');
  if (await fileExists(defaultLogoPath)) {
    const imageBuffer = await fs.readFile(defaultLogoPath);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  }
  return 'https://placehold.co/200x100/e2e8f0/475569?text=Logo+Not+Found';
}

// ===================================
// === FUNGSI BARU UNTUK LOGO FOOTER ===
// ===================================
async function getSiloamLogoUrl() {
  const logoPath = path.resolve(process.cwd(), 'public/asset/logo/logo2.png');
  if (await fileExists(logoPath)) {
    const imageBuffer = await fs.readFile(logoPath);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  }
  // Fallback jika logo2.png tidak ditemukan
  return 'https://placehold.co/200x100/e2e8f0/475569?text=Logo2+Err';
}

// === HANDLER UTAMA ===
exports.handler = async (event) => {
  console.log('🚀 Function generate-story dipanggil');
  const { doctors, theme, logo } = event.queryStringParameters || {};

  if (!doctors) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Parameter doctors diperlukan' }) };
  }

  const doctorIds = doctors.split(',');
  const selectedTheme = theme || 'gradient-blue';
  let browser = null;

  try {
    const allDoctorData = await getCombinedDoctorData();
    const selectedDoctors = doctorIds.map((id) => allDoctorData.find((d) => d.id === id)).filter(Boolean);

    if (selectedDoctors.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Dokter tidak ditemukan' }) };
    }

    // Memuat kedua logo secara bersamaan
    const [logoUrl, siloamLogoUrl] = await Promise.all([
        getLogoUrl(logo),
        getSiloamLogoUrl() // Memanggil fungsi logo footer
    ]);

    const doctorListContainerHTML = generateDoctorHTML(selectedDoctors, selectedTheme);
    const templatePath = path.resolve(process.cwd(), 'public/story-template.html');
    let htmlContent = await fs.readFile(templatePath, 'utf8');

    // Mengganti semua placeholder
    htmlContent = htmlContent
      .replace('{{THEME_CLASS}}', `theme-${selectedTheme}`)
      .replace('{{LOGO_SRC}}', logoUrl)
      .replace('{{SILOAM_LOGO_SRC}}', siloamLogoUrl) // <-- PERGANTIAN BARU
      .replace('{{DOCTOR_LIST_HTML}}', doctorListContainerHTML);

    // === LAUNCH BROWSER DENGAN PERBAIKAN OTOMATIS ===
    let browserOptions;
    const isLocal = !process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY_DEV === 'true';

    if (!isLocal) {
      // 🌐 MODE CLOUD
      console.log('🌐 Mode Cloud: @sparticuz/chromium');
      const executablePath = await chromium.executablePath();
      if (!executablePath) throw new Error('Chromium executable path tidak ditemukan di environment cloud.');
      console.log(`📍 Path Chromium (Cloud): ${executablePath}`);

      browserOptions = {
        args: chromium.args,
        defaultViewport: { width: 1080, height: 1920 },
        executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
      };
      browser = await puppeteer.launch(browserOptions);
    } else {
      // 💻 MODE LOKAL
      console.log('💻 Mode Lokal: menggunakan puppeteer full (bukan @sparticuz/chromium)');
      const puppeteerFull = require('puppeteer');
      browser = await puppeteerFull.launch({
        headless: true,
        defaultViewport: { width: 1080, height: 1920 },
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));

    const imageBuffer = await page.screenshot({ type: 'png' });
    console.log('✅ Screenshot berhasil dibuat');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'image/png' },
      body: imageBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('❌ Error handler:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message, stack: error.stack }) };
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('🧹 Browser closed');
      } catch (closeErr) {
        console.error('Error closing browser:', closeErr);
      }
    }
  }
};