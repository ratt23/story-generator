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

// Note: We use an options object to keep it cleaner or just multiple args
// Updated Logic to support dateFontSize
function generateDoctorHTML(doctors, theme, fontSize = 1, textAlign = 'center', dateFontSize = 1) {
  const isLightTheme = theme === 'solid-white' || theme === 'solid-white-dots';
  const numDoctors = doctors.length;

  let styles;
  // ... (adaptive layout logic remains same for container/item structure) ...
  // Re-declaring to ensure we have the objects

  styles = {
    container: `w-full flex flex-col items-center justify-center flex-grow px-12 transition-all relative z-10`,
    item: isLightTheme ? "flex items-center w-full bg-slate-100 rounded-2xl p-4 shadow-lg border border-slate-200" : "flex items-center w-full bg-white/20 rounded-2xl p-4 shadow-lg",
    photo: "w-24 h-24 rounded-full object-cover border-4 flex-shrink-0",
    textContainer: "ml-4 text-left flex-grow",
    name: "font-bold leading-tight",
    specialty: "",
    date: "mt-1"
  };

  if (numDoctors > 5) {
    styles.item += " p-3";
  }

  if (isLightTheme) {
    styles.photo += " border-white shadow-md";
    styles.name += " text-slate-800";
    styles.specialty += " text-slate-600";
    styles.date += " text-slate-600";
  } else if (theme === 'siloam-white-dots') {
    styles.item = styles.item.replace('bg-white/20', 'bg-[#003B73] shadow-lg'); // Override card bg
    styles.photo += " border-white";
    styles.name += " text-white";
    styles.specialty += " text-white/90";
    styles.date += " text-[#FBAF17]"; // Yellow Date
  } else {
    styles.photo += " border-white";
    styles.specialty += " opacity-90";
  }

  const doctorsHTML = doctors.map(doctor => {
    const leaveDatesText = (doctor.cutiMulai === doctor.cutiSelesai)
      ? formatFullDate(doctor.cutiMulai)
      : `${formatFullDate(doctor.cutiMulai)} - ${formatFullDate(doctor.cutiSelesai)}`;

    // Generate Typography Styles
    const alignClass = textAlign === 'center' ? 'text-center' : 'text-left';

    const baseNameSize = 1.5;
    const baseSpecSize = 1.125;
    const fsVal = fontSize ? parseFloat(fontSize) : 1.0;
    const dateFsVal = dateFontSize ? parseFloat(dateFontSize) : 1.0;

    return `
            <div class="${styles.item}">
                <img src="${doctor.fotourl}" class="${styles.photo}" alt="Foto ${doctor.nama}" onerror="this.src='https://placehold.co/200x200/e2e8f0/475569?text=Photo+Error'">
                <div class="${styles.textContainer} ${alignClass}">
                    <h3 class="${styles.name}" style="font-size: ${baseNameSize * fsVal}rem">${doctor.nama}</h3>
                    <p class="${styles.specialty}" style="font-size: ${baseSpecSize * fsVal}rem">${doctor.spesialis}</p>
                    <p class="${styles.date}" style="font-size: ${baseSpecSize * dateFsVal}rem">Tidak praktek: <strong class="font-semibold">${leaveDatesText}</strong></p>
                </div>
            </div>`;
  }).join('');

  return `<div class="${styles.container}" id="doctor-list-container">{{DOCTOR_HTML}}</div>`.replace('{{DOCTOR_HTML}}', doctorsHTML);
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
module.exports.handler = async (event) => {
  console.log('🚀 Function generate-story dipanggil');
  const { doctors, theme, logo, format, customMessage, fontSize, dateFontSize, headerFontSize, headerTop, headerMain, headerTopSize, headerMainSize, textAlign, verticalPos, spacing, showFooter } = event.queryStringParameters || {};

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

    // Generate Typography & Layout Styles
    const fontSizeVal = fontSize ? parseFloat(fontSize) : 1;
    const dateFontSizeVal = dateFontSize ? parseFloat(dateFontSize) : 1;
    const headerFontSizeVal = headerFontSize ? parseFloat(headerFontSize) : 1;

    const textAlignVal = textAlign || 'center';
    const verticalPosVal = verticalPos ? parseInt(verticalPos) : 0;
    const spacingVal = spacing ? parseInt(spacing) : 24;

    const count = selectedDoctors.length;
    let scaleFactor = 1;

    // Strict Adaptive Scaling Logic (Server-side)
    if (format === 'square') {
      if (count > 4) scaleFactor = 1 - ((count - 4) * 0.10);
    } else {
      if (count > 6) scaleFactor = 1 - ((count - 6) * 0.05);
    }
    if (scaleFactor < 0.5) scaleFactor = 0.5;

    // Inject Custom Styles
    // We target #doctor-list-container and indirect children via CSS injection
    // But since generateDoctorHTML returns the container, we can inject inline styles slightly differently or via the `< style > ` block in template

    const customStyles = `
        text-align: ${textAlignVal};
    `;

    // Apply header font size scaling
    // We target the header container specifically (MB-8 class in template or we can add ID)
    // The template has "mb-8 w-full px-12" for the header block.
    // It does not have an ID. We can attempt to replace specific content to inject style.
    // Look for <div class="mb-8 w-full px-12"> in the template file read below.
    // However, better way is to add an ID in the template file OR just rely on structure.
    // Since we can't edit template in this turn easily without double tool call, 
    // we will inject a CSS rule for the header if possible.
    // .mb-8 is generic. 
    // Let's modify the htmlContent string replacement logic below.

    const transformStyle = `transform: translateY(${verticalPosVal}px) scale(${scaleFactor}); transform-origin: top center; gap: ${spacingVal}px;`;

    const formatClass = (format === 'square') ? 'square' : '';

    let doctorListContainerHTML = generateDoctorHTML(selectedDoctors, selectedTheme, fontSizeVal, textAlignVal, dateFontSizeVal);

    // Inject position/spacing styles into the container ID we added
    doctorListContainerHTML = doctorListContainerHTML.replace('id="doctor-list-container"', `id="doctor-list-container" style="${transformStyle}"`);

    const templatePath = path.resolve(process.cwd(), 'public/story-template.html');
    let htmlContent = await fs.readFile(templatePath, 'utf8');

    // Determine CSS class for background
    let themeCssClass = `theme-${selectedTheme}`;
    // Map 'siloam-white-dots' to existing 'theme-solid-white-dots' CSS for background
    if (selectedTheme === 'siloam-white-dots') {
      themeCssClass = 'theme-solid-white-dots';
    }

    // Mengganti semua placeholder
    htmlContent = htmlContent
      .replace('{{THEME_CLASS}}', themeCssClass)
      .replace('{{FORMAT_CLASS}}', formatClass)
      .replace('{{CUSTOM_STYLES}}', customStyles)
      .replace('{{LOGO_SRC}}', logoUrl)
      // Custom Logic for Footer Logo
      .replace('{{SILOAM_LOGO_SRC}}', (showFooter === 'false')
        ? 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' // Transparent pixel 
        : siloamLogoUrl)
      .replace('{{HEADER_TOP}}', headerTop || 'PEMBERITAHUAN')
      .replace('{{HEADER_MAIN}}', headerMain || 'DOKTER CUTI')
      .replace('{{DOCTOR_LIST_HTML}}', doctorListContainerHTML)
      .replace('{{CUSTOM_MESSAGE}}', customMessage ? customMessage : '');

    // If hidden, also try to hide the hashtag text "SiloamHospitals" if it exists in footer?
    // User only asked to hide "logo siloam yang dibawah".
    // I'll stick to hiding/replacing the logo source for now. 
    // If I need to hide the ENTIRE footer, I would need a better target.
    // However, keeping the hashtag might be desired? "tulisan warna putih" mentioned in theme request usually applies to footer text too.

    // Let's refine the theme logic for background.
    // We need to ensure `theme-siloam-white-dots` is handled in CSS or via inline styles here.
    // The `{{THEME_CLASS}}` is used in CSS. If I added a new theme value `siloam-white-dots`, 
    // I need to make sure there is CSS for it in `story-template.html` OR inject it via `customStyles`.

    // I haven't updated `story-template.html` to have `.theme-siloam-white-dots`. 
    // I should inject the background style for it in `customStyles`.

    // Clean up theme specific logic placeholder blocks if any remained
    // (No-op in this clean version)

    // Inject Header Scaling
    // Calculate final sizes based on input (or default) * global header scale
    const headerTopSizeVal = headerTopSize ? parseFloat(headerTopSize) : 48;
    const headerMainSizeVal = headerMainSize ? parseFloat(headerMainSize) : 128; // Default 9xl ~ 128px

    const finalTopSize = headerTopSizeVal * headerFontSizeVal;
    const finalMainSize = headerMainSizeVal * headerFontSizeVal;

    // Inject styles directly into the elements.
    // We use regex to ensure we match the classes in the template.
    // <p class="text-5xl ..."> -> <p style="font-size: XXpx" class="text-5xl ...">
    htmlContent = htmlContent.replace(
      '<p class="text-5xl',
      `<p style="font-size: ${finalTopSize}px" class="text-5xl`
    );

    htmlContent = htmlContent.replace(
      '<h2 class="text-9xl',
      `<h2 style="font-size: ${finalMainSize}px" class="text-9xl`
    );

    // We no longer scale the container div, matching frontend behavior.
    // The container scaling block is effectively removed/replaced by this.

    // === LAUNCH BROWSER DENGAN PERBAIKAN OTOMATIS ===
    let browserOptions;

    // Config for Local Development (Windows) vs Production (Netlify/AWS)
    if (process.env.NETLIFY_DEV) {
      // LOCAL DEVELOPMENT
      // Try to find local Chrome installation
      const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      ];

      let executablePath = null;
      const fs = require('fs');
      for (const pt of possiblePaths) {
        if (fs.existsSync(pt)) {
          executablePath = pt;
          break;
        }
      }

      browserOptions = {
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath || await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      };
      console.log('🔧 Running in Local Dev Mode. Executable:', browserOptions.executablePath);
    } else {
      // PRODUCTION (Netlify/AWS Lambda)
      browserOptions = {
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      };
    }

    browser = await puppeteer.launch(browserOptions);

    const page = await browser.newPage();
    await page.setViewport((format === 'square') ? { width: 1080, height: 1080 } : { width: 1080, height: 1920 });
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
    console.error('❌ Error generating story:', error);
    if (browser) await browser.close();
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal membuat story', details: error.message, stack: error.stack })
    };
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