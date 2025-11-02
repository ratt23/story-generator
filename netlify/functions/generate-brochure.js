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

        // Distribusi data ke kolom
        allData.sort((a, b) => b.doctors.length - a.doctors.length);
        const columns = [[], [], [], []];
        const columnDoctorCounts = [0, 0, 0, 0];
        
        allData.forEach(spec => {
            let targetColumnIndex = 0;
            columnDoctorCounts.forEach((count, i) => {
                if (count < columnDoctorCounts[targetColumnIndex]) {
                    targetColumnIndex = i;
                }
            });
            columns[targetColumnIndex].push(spec);
            columnDoctorCounts[targetColumnIndex] += spec.doctors.length;
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

        // Generate HTML
        const insideHtml = insideTemplate
            .replace('{{COLUMN_1_HTML}}', generateHtmlForDoctors(insideColumn1Data))
            .replace('{{COLUMN_2_HTML}}', generateHtmlForDoctors(insideColumn2Data))
            .replace('{{COLUMN_3_HTML}}', generateHtmlForDoctors(insideColumn3Data))
            .replace('{{GENERATED_DATE}}', generatedDate);

        let outsideHtml = outsideTemplate
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