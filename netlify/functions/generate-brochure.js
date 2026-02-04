const path = require('path');
const https = require('https');

// Ganti URL Google Sheets dengan URL API Netlify
const GOOGLE_SCRIPT_JADWAL_URL = 'https://dashboarddev.netlify.app/.netlify/functions/getDoctors';

async function processImage(pathOrUrl, host) {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http')) return pathOrUrl;

    const cleanPath = pathOrUrl.replace(/^public\//, '');
    const fullUrl = `https://${host}/${cleanPath}`;

    try {
        const imageBuffer = await new Promise((resolve, reject) => {
            const request = https.get(fullUrl, (response) => {
                if (response.statusCode === 200) {
                    const data = [];
                    response.on('data', (chunk) => data.push(chunk));
                    response.on('end', () => resolve(Buffer.concat(data)));
                } else {
                    reject(new Error(`HTTP ${response.statusCode}`));
                }
            });
            request.on('error', reject);
            request.setTimeout(10000, () => {
                request.destroy();
                reject(new Error('Timeout'));
            });
        });

        const extension = path.extname(cleanPath).toLowerCase().slice(1);
        const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

    } catch (error) {
        console.log(`❌ Gagal memproses gambar ${cleanPath}: ${error.message}`);
        return `/${cleanPath}`;
    }
}

async function processLogo(host) {
    const possibleLogoPaths = [
        'public/asset/logo/logo.png',
        'asset/logo/logo.png',
        'public/asset/logo.png',
        'asset/logo.png'
    ];

    for (const logoPath of possibleLogoPaths) {
        try {
            const fullUrl = `https://${host}/${logoPath.replace(/^public\//, '')}`;

            const imageBuffer = await new Promise((resolve, reject) => {
                const request = https.get(fullUrl, (response) => {
                    if (response.statusCode === 200) {
                        const data = [];
                        response.on('data', (chunk) => data.push(chunk));
                        response.on('end', () => resolve(Buffer.concat(data)));
                    } else {
                        reject(new Error(`HTTP ${response.statusCode}`));
                    }
                });

                request.on('error', () => reject(new Error('Network error')));
                request.setTimeout(5000, () => {
                    request.destroy();
                    reject(new Error('Timeout'));
                });
            });

            return `data:image/png;base64,${imageBuffer.toString('base64')}`;

        } catch (error) {
            continue;
        }
    }
    return '/asset/logo/logo.png'; // Fallback
}

function fetchData(url, redirectCount = 0) {
    if (redirectCount > 5) {
        return Promise.reject(new Error('Terlalu banyak pengalihan.'));
    }

    // Tambahkan cache-busting
    const urlWithCacheBust = new URL(url);
    urlWithCacheBust.searchParams.append('t', new Date().getTime());

    return new Promise((resolve, reject) => {
        const req = https.get(urlWithCacheBust.href, (res) => {
            if ([301, 302, 307].includes(res.statusCode)) {
                return resolve(fetchData(new URL(res.headers.location, url).href, redirectCount + 1));
            }

            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP status code ${res.statusCode}`));
            }

            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Gagal parsing JSON.'));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}


async function getJadwalData() {
    const jadwalData = await fetchData(GOOGLE_SCRIPT_JADWAL_URL);

    if (!jadwalData || Object.keys(jadwalData).length === 0) {
        throw new Error('Data dari API kosong.');
    }

    // Format data dari API getDoctors sudah { "anak": { title: "..." } }
    return Object.values(jadwalData).map(spec => ({
        title: spec.title,
        doctors: spec.doctors.map(doc => ({
            name: doc.name,
            schedule: doc.schedule // schedule bisa jadi objek atau string
        })),
    }));
}

function generateHtmlForDoctors(data) {
    if (!data || data.length === 0) {
        return '<div class="specialization-group"><p>Tidak ada jadwal dokter</p></div>';
    }

    const daysOrder = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    let html = '';

    data.forEach(spec => {
        html += `<div class="specialization-group"><h3 class="specialization-title">${spec.title}</h3>`;
        spec.doctors.forEach(doc => {
            html += `<div class="doctor-card"><p class="doctor-name">${doc.name}</p><div class="schedule-grid">`;

            // --- Logika baru untuk menangani format jadwal string atau objek ---
            const scheduleEntries = [];
            const schedule = doc.schedule || {};

            for (const day of daysOrder) {
                const scheduleData = schedule[day];
                let scheduleTime = null;

                if (typeof scheduleData === 'string') {
                    scheduleTime = scheduleData; // Format baru
                } else if (typeof scheduleData === 'object' && scheduleData !== null && scheduleData.jam) {
                    scheduleTime = scheduleData.jam; // Format lama
                }

                if (scheduleTime && scheduleTime.trim() !== '' && scheduleTime.trim() !== '-') {
                    scheduleEntries.push([day, scheduleTime]);
                }
            }
            // --- Akhir logika baru ---

            if (scheduleEntries.length === 0) {
                html += `<div class="schedule-day">Jadwal tidak tersedia</div>`;
            } else {
                scheduleEntries.forEach(([day, time]) => {
                    const dayFormatted = day.charAt(0).toUpperCase() + day.slice(1);
                    html += `<div class="schedule-day"><strong>${dayFormatted}:</strong> ${time}</div>`;
                });
            }
            html += `</div></div>`;
        });
        html += `</div>`;
    });
    return html;
}

exports.handler = async (event) => {
    console.log('🚀 Function generate-brochure dipanggil');

    try {
        const { cover, bg } = event.queryStringParameters || {};
        const host = event.headers.host;

        if (!host) {
            throw new Error("Header 'host' tidak ditemukan");
        }

        // Ambil data jadwal dari API (bukan cache)
        const allData = await getJadwalData();
        if (!allData || allData.length === 0) {
            throw new Error('Tidak ada data jadwal yang ditemukan.');
        }

        // --- Smart Sorting Logic ---
        const getCategoryScore = (title) => {
            const t = title.toLowerCase();
            if (t.includes('gigi') || t.includes('mulut')) return 10;
            if (t.includes('bedah') || t.includes('orthopaedi') || t.includes('urologi') || t.includes('onkologi')) return 20;
            if (t.includes('kandungan') || t.includes('kebidanan') || t.includes('obgyn') || t.includes('anak')) return 30;
            if (t.includes('penyakit dalam') || t.includes('jantung') || t.includes('paru')) return 40;
            if (t.includes('mata') || t.includes('tht') || t.includes('kulit') || t.includes('saraf') || t.includes('jiwa')) return 50;
            return 100; // Lainnya
        };

        allData.sort((a, b) => {
            const scoreA = getCategoryScore(a.title);
            const scoreB = getCategoryScore(b.title);
            if (scoreA !== scoreB) return scoreA - scoreB;
            return a.title.localeCompare(b.title);
        });

        // --- Weighted Continuous Distribution Logic ---
        // Bobot dalam estimasi pixel: Header ~15px, Dokter ~35px (dengan margin/padding)
        const HEADER_WEIGHT = 15;
        const DOCTOR_WEIGHT = 35;

        // Hitung Total Weight untuk Dynamic Styling
        let totalWeight = 0;
        allData.forEach(spec => {
            totalWeight += HEADER_WEIGHT + (spec.doctors.length * DOCTOR_WEIGHT);
        });

        // --- Dynamic Style generation ---
        // Estimasi kapasitas per kolom ~ 700px. Total 4 kolom ~ 2800px.
        // Jika totalWeight < 1800 (Low Data) -> Spacious
        // Jika totalWeight < 2400 (Medium Data) -> Normal
        // Jika totalWeight >= 2400 (High Data) -> Compact

        let styleMode = 'NORMAL';
        let dynamicCss = '';

        if (totalWeight < 2000) {
            styleMode = 'SPACIOUS';
            dynamicCss = `
            <style>
                .specialization-title { font-size: 12px !important; margin-bottom: 4px !important; }
                .doctor-name { font-size: 10px !important; margin-bottom: 2px !important; }
                .schedule-grid { font-size: 9px !important; gap: 1px 4px !important; }
                .doctor-card { padding: 4px !important; margin-bottom: 4px !important; }
                .specialization-group { margin-bottom: 6px !important; }
            </style>`;
        } else if (totalWeight < 2600) {
            styleMode = 'NORMAL';
            dynamicCss = `
            <style>
                .specialization-title { font-size: 10.5px !important; margin-bottom: 3px !important; }
                .doctor-name { font-size: 9px !important; margin-bottom: 1px !important; }
                .schedule-grid { font-size: 8px !important; gap: 0px 4px !important; }
                .doctor-card { padding: 3px !important; margin-bottom: 3px !important; }
                .specialization-group { margin-bottom: 4px !important; }
            </style>`;
        } else {
            styleMode = 'COMPACT';
            dynamicCss = `
            <style>
                .specialization-title { font-size: 9px !important; margin-bottom: 1px !important; }
                .doctor-name { font-size: 7.5px !important; margin-bottom: 0px !important; }
                .schedule-grid { font-size: 6.5px !important; gap: 0px 2px !important; }
                .doctor-card { padding: 1.5px !important; margin-bottom: 1px !important; }
                .specialization-group { margin-bottom: 2px !important; }
            </style>`;
        }

        console.log(`📊 Dynamic Style Mode: ${styleMode} (Total Weight: ${totalWeight})`);

        // Kembali ke Balanced Distribution / 4 karena font size akan menyesuaikan
        const targetWeightPerColumn = Math.ceil(totalWeight / 4);
        const columns = [[], [], [], []];
        let currentColumn = 0;
        let currentColumnWeight = 0;

        allData.forEach(spec => {
            const specWeight = HEADER_WEIGHT + (spec.doctors.length * DOCTOR_WEIGHT);
            const remainingSpace = targetWeightPerColumn - currentColumnWeight;

            // Jika masih di kolom 0-2 (bukan terakhir) DAN grup ini tidak muat full
            // Buffer diperbesar sedikit agar tidak terlalu split
            if (currentColumn < 3 && (currentColumnWeight + specWeight > targetWeightPerColumn + 20)) {

                if (remainingSpace < HEADER_WEIGHT + 20) {
                    // Sisa space terlalu kecil
                    currentColumn++;
                    currentColumnWeight = 0;
                    columns[currentColumn].push(spec);
                    currentColumnWeight += specWeight;
                } else {
                    // Split content!
                    const availableForDocs = remainingSpace - HEADER_WEIGHT;
                    let docsToFit = Math.floor(availableForDocs / DOCTOR_WEIGHT);

                    if (docsToFit < 1 && availableForDocs > 15) docsToFit = 1;

                    if (docsToFit > 0) {
                        const part1 = {
                            title: spec.title,
                            doctors: spec.doctors.slice(0, docsToFit)
                        };
                        columns[currentColumn].push(part1);

                        currentColumn++;
                        currentColumnWeight = 0;

                        if (docsToFit < spec.doctors.length) {
                            const part2 = {
                                title: `${spec.title} (Lanjutan)`,
                                doctors: spec.doctors.slice(docsToFit)
                            };
                            columns[currentColumn].push(part2);
                            currentColumnWeight += HEADER_WEIGHT + (part2.doctors.length * DOCTOR_WEIGHT);
                        }
                    } else {
                        currentColumn++;
                        currentColumnWeight = 0;
                        columns[currentColumn].push(spec);
                        currentColumnWeight += specWeight;
                    }
                }
            } else {
                columns[currentColumn].push(spec);
                currentColumnWeight += specWeight;
            }
        });

        const [outsideColumn1Data, insideColumn1Data, insideColumn2Data, insideColumn3Data] = columns;

        // Baca template files
        const insideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-inside.html');
        const outsideTemplatePath = path.resolve(process.cwd(), 'public', 'brochure-template-outside.html');

        const [insideTemplate, outsideTemplate] = await Promise.all([
            require('fs').promises.readFile(insideTemplatePath, 'utf8'),
            require('fs').promises.readFile(outsideTemplatePath, 'utf8')
        ]);

        const generatedDate = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Process semua gambar termasuk 3.png dan 4.png
        const logoUrl = await processLogo(host);
        const [finalCoverImageUrl, finalBgImageUrl, image3Url, image4Url] = await Promise.all([
            processImage(cover || 'public/asset/brochure/1.png', host),
            processImage(bg || 'public/asset/brochure/2.png', host),
            processImage('public/asset/brochure/3.png', host),
            processImage('public/asset/brochure/4.png', host)
        ]);

        console.log('📊 Hasil proses gambar:');
        console.log('  Logo:', logoUrl ? '✅ BERHASIL' : '❌ GAGAL');
        console.log('  Cover 1.png:', finalCoverImageUrl ? '✅ BERHASIL' : '❌ GAGAL');
        console.log('  Background 2.png:', finalBgImageUrl ? '✅ BERHASIL' : '❌ GAGAL');
        console.log('  Gambar 3.png:', image3Url ? '✅ BERHASIL' : '❌ GAGAL');
        console.log('  Gambar 4.png:', image4Url ? '✅ BERHASIL' : '❌ GAGAL');

        // Generate HTML - INJECT DYNAMIC CSS
        const insideHtml = insideTemplate
            .replace('</head>', `${dynamicCss}</head>`) // Inject CSS
            .replace('{{COLUMN_1_HTML}}', generateHtmlForDoctors(insideColumn1Data))
            .replace('{{COLUMN_2_HTML}}', generateHtmlForDoctors(insideColumn2Data))
            .replace('{{COLUMN_3_HTML}}', generateHtmlForDoctors(insideColumn3Data))
            .replace('{{GENERATED_DATE}}', generatedDate);

        let outsideHtml = outsideTemplate
            .replace('</head>', `${dynamicCss}</head>`) // Inject CSS
            .replace('{{COLUMN_1_OUTSIDE}}', generateHtmlForDoctors(outsideColumn1Data))
            .replace('{{COVER_IMAGE_SRC}}', finalCoverImageUrl)
            .replace('{{COVER_BACKGROUND_SRC}}', finalBgImageUrl)
            .replace('{{LOGO_SILOAM_WARNA}}', logoUrl)
            .replace('{{GAMBAR_3_SRC}}', image3Url)
            .replace('{{GAMBAR_4_SRC}}', image4Url); // Pastikan 4.png ada di template luar jika digunakan

        const finalHtml = `${insideHtml}<div style="page-break-after: always;"></div>${outsideHtml}`;

        console.log('🎉 Brosur berhasil di-generate!');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: finalHtml,
        };

    } catch (error) {
        console.error("💥 ERROR:", error);

        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html' },
            body: `<html><body><h1>Terjadi Kesalahan</h1><p>${error.message}</p></body></html>`,
        };
    }
};