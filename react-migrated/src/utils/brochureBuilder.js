/**
 * Universal Brochure HTML Generator for Story Generator
 * Supports:
 * 1. Regular 3-Fold Brochure (Trifold A4 Landscape - Accurate Real-Pixel Balanced Distribution, Zero Cutoffs, Full Custom Groups, Editable Texts, Layout Tuning, Live Preview & Save)
 * 2. Executive 2-Fold Brochure (Bifold A4 Landscape - White Gold Theme, Database Logo, Layout Tuning, & 100% Fully Editable/Clearable Texts)
 */

const API_BASE = 'https://dashdev2.netlify.app/.netlify/functions/api';

const DAYS_MAP = [
    { key: 'senin', aliases: ['senin', 'Senin', 'SENIN', 'mon', 'monday'] },
    { key: 'selasa', aliases: ['selasa', 'Selasa', 'SELASA', 'tue', 'tuesday'] },
    { key: 'rabu', aliases: ['rabu', 'Rabu', 'RABU', 'wed', 'wednesday'] },
    { key: 'kamis', aliases: ['kamis', 'Kamis', 'KAMIS', 'thu', 'thursday'] },
    { key: 'jumat', aliases: ['jumat', 'Jumat', 'JUMAT', 'fri', 'friday'] },
    { key: 'sabtu', aliases: ['sabtu', 'Sabtu', 'SABTU', 'sat', 'saturday'] },
    { key: 'minggu', aliases: ['minggu', 'Minggu', 'MINGGU', 'sun', 'sunday'] },
];

export function cleanDoctorName(n) {
    if (!n) return '';
    let c = n.toLowerCase();
    c = c.replace(/^(dr\.|drg\.|dr |drg |dr\.\s*dr\.|dr\s+|drg\s+)/gi, '');
    c = c.split(',')[0].trim();
    c = c.replace(/\b[a-z]\b/g, '').trim();
    c = c.replace(/[^a-z0-9]/g, '');
    return c;
}

export function createDoctorSlug(n) {
    if (!n) return '';
    let clean = n.toLowerCase();
    clean = clean.replace(/^(dr\.|drg\.|dr |drg )/g, '');
    clean = clean.replace(/,\s*(sh|mhkes|mars|spa|sppd|spb|spog|spn|spjp|sptht|spm|span|spkfr|fics|finacs|fiatcvs|subsp.*|k-.*|biomed.*)/gi, '');
    clean = clean.replace(/[^a-z0-9\s-]/g, '');
    clean = clean.trim().replace(/\s+/g, '-');
    return clean;
}

export function getInitials(name) {
    if (!name) return 'DR';
    const clean = name.replace(/^(dr\.|drg\.|dr |drg )/gi, '').trim();
    const parts = clean.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return 'DR';
}

export function extractDoctorScheduleEntries(scheduleObj) {
    if (!scheduleObj || typeof scheduleObj !== 'object') return [];
    const entries = [];

    DAYS_MAP.forEach(({ key, aliases }) => {
        let scheduleTime = null;

        for (const alias of aliases) {
            const rawVal = scheduleObj[alias];
            if (rawVal !== undefined && rawVal !== null) {
                if (typeof rawVal === 'string') {
                    scheduleTime = rawVal.trim();
                } else if (typeof rawVal === 'object' && rawVal.jam) {
                    scheduleTime = String(rawVal.jam).trim();
                } else if (typeof rawVal === 'object' && rawVal.time) {
                    scheduleTime = String(rawVal.time).trim();
                }
                if (scheduleTime) break;
            }
        }

        if (scheduleTime && scheduleTime !== '' && scheduleTime !== '-' && scheduleTime !== 'Libur' && scheduleTime !== 'Tutup') {
            const dayFormatted = key.charAt(0).toUpperCase() + key.slice(1);
            entries.push({ day: dayFormatted, time: scheduleTime });
        }
    });

    return entries;
}

function resolveTextValue(userVal, defaultVal) {
    if (userVal !== undefined && userVal !== null) {
        return userVal;
    }
    return defaultVal;
}

// =========================================================================
// REGULAR 3-FOLD BROCHURE ENGINE (Trifold A4 Landscape)
// =========================================================================

export async function fetchRegularDoctorGroups() {
    const timestamp = Date.now();
    const res = await fetch(`${API_BASE}/doctors?limit=200&t=${timestamp}`);
    if (!res.ok) throw new Error(`Gagal mengambil data jadwal reguler (${res.status})`);
    const rawData = await res.json();

    const rawDocs = Array.isArray(rawData) 
        ? rawData 
        : (rawData.doctors && Array.isArray(rawData.doctors) ? rawData.doctors : []);

    const grouped = {};
    rawDocs.forEach((doc, idx) => {
        if (!doc || !doc.name || doc.name.trim() === '.' || doc.name.trim() === '') return;
        const spec = doc.specialty || 'Umum';
        if (!grouped[spec]) {
            grouped[spec] = { id: `regular-group-${spec}`, title: spec, doctors: [] };
        }
        grouped[spec].doctors.push({
            id: `reg-doc-${idx}-${createDoctorSlug(doc.name)}`,
            name: doc.name.trim(),
            specialty: spec,
            schedule: doc.schedule || {},
            slug: createDoctorSlug(doc.name),
            visible: true
        });
    });

    const allGroups = Object.values(grouped);

    const getCategoryScore = (title) => {
        const t = title.toLowerCase();
        if (t.includes('gigi') || t.includes('mulut')) return 10;
        if (t.includes('bedah') || t.includes('orthopaedi') || t.includes('urologi') || t.includes('onkologi')) return 20;
        if (t.includes('kandungan') || t.includes('kebidanan') || t.includes('obgyn') || t.includes('anak')) return 30;
        if (t.includes('penyakit dalam') || t.includes('jantung') || t.includes('paru')) return 40;
        if (t.includes('mata') || t.includes('tht') || t.includes('kulit') || t.includes('saraf') || t.includes('jiwa')) return 50;
        return 100;
    };

    allGroups.sort((a, b) => {
        const scoreA = getCategoryScore(a.title);
        const scoreB = getCategoryScore(b.title);
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.title.localeCompare(b.title);
    });

    return allGroups;
}

function calculateDoctorPixelHeight(doc, layout) {
    const daysOrder = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    let validDays = 0;
    const schedule = doc.schedule || {};
    for (const d of daysOrder) {
        const val = schedule[d];
        const time = (typeof val === 'string' ? val : (val && val.jam ? val.jam : '')) || '';
        if (time.trim() && time.trim() !== '-') validDays++;
    }

    // 1-3 pills = 1 line (~14px), 4-6 pills = 2 lines (~28px), >6 pills = 3 lines (~42px)
    const pillLines = validDays <= 3 ? 1 : (validDays <= 6 ? 2 : 3);
    const pillHeight = pillLines * (layout.scheduleFontSize + 7);
    const nameHeight = layout.doctorFontSize + 3;
    const cardPadding = layout.cardPadding * 2;
    const cardMargin = layout.doctorCardSpacing;

    return nameHeight + pillHeight + cardPadding + cardMargin + 3;
}

function calculateGroupHeaderPixelHeight(layout) {
    return layout.titleFontSize + 5 + layout.specialtySpacing;
}

function generateHtmlForRegularDoctors(data) {
    if (!data || data.length === 0) {
        return '';
    }

    const daysOrder = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    let html = '';

    data.forEach(spec => {
        html += `<div class="specialization-group"><h3 class="specialization-title">${spec.title}</h3>`;
        (spec.doctors || []).forEach(doc => {
            html += `<div class="doctor-card"><p class="doctor-name">${doc.name}</p><div class="schedule-grid">`;

            const scheduleEntries = [];
            const schedule = doc.schedule || {};

            for (const day of daysOrder) {
                const scheduleData = schedule[day];
                let scheduleTime = null;

                if (typeof scheduleData === 'string') {
                    scheduleTime = scheduleData;
                } else if (typeof scheduleData === 'object' && scheduleData !== null && scheduleData.jam) {
                    scheduleTime = scheduleData.jam;
                }

                if (scheduleTime && scheduleTime.trim() !== '' && scheduleTime.trim() !== '-') {
                    scheduleEntries.push([day, scheduleTime]);
                }
            }

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

export async function buildRegularBrochureHtml({ 
    customGroups = null,
    textConfig = {},
    layoutConfig = {},
    coverUrl = 'asset/brochure/1.png', 
    bgUrl = 'asset/brochure/2.png',
    logoUrl = '/asset/logo/logo.png',
    image3Url = '/asset/brochure/3.png',
    image4Url = '/asset/brochure/4.png'
}) {
    const rawGroups = (customGroups && customGroups.length > 0)
        ? customGroups
        : await fetchRegularDoctorGroups();

    // Filter only visible doctors
    const allData = rawGroups.map(g => ({
        ...g,
        doctors: (g.doctors || []).filter(d => d.visible !== false)
    })).filter(g => g.doctors.length > 0);

    // Text configuration values
    const texts = {
        insideMainTitle: resolveTextValue(textConfig.insideMainTitle, 'Jadwal Poliklinik Dokter Spesialis'),
        insideSubtitle: resolveTextValue(textConfig.insideSubtitle, 'Siloam Hospitals Ambon'),
        updateDate: resolveTextValue(textConfig.updateDate, new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })),
        
        outsideHospitalName: resolveTextValue(textConfig.outsideHospitalName, 'Siloam Hospitals Ambon'),
        outsideAddress: resolveTextValue(textConfig.outsideAddress, 'Jl. Sultan Hasanudin, Hative Kecil, Kec. Sirimau, Kota Ambon, Maluku'),
        outsidePhone: resolveTextValue(textConfig.outsidePhone, 'Telp: (0911) 3911900 / 0812-4040-3900'),
        
        outsideCoverTitle1: resolveTextValue(textConfig.outsideCoverTitle1, 'Jadwal Poliklinik'),
        outsideCoverTitle2: resolveTextValue(textConfig.outsideCoverTitle2, 'Dokter Spesialis'),
        outsideCoverHospital: resolveTextValue(textConfig.outsideCoverHospital, 'Siloam Hospitals Ambon'),
        outsideCoverYear: resolveTextValue(textConfig.outsideCoverYear, '2025/2026')
    };

    // Layout & Spacing Tuning Configuration
    const layout = {
        globalScale: layoutConfig.globalScale !== undefined ? layoutConfig.globalScale : 100, // %
        offsetX: layoutConfig.offsetX !== undefined ? layoutConfig.offsetX : 0, // px
        offsetY: layoutConfig.offsetY !== undefined ? layoutConfig.offsetY : 0, // px
        panelPaddingX: layoutConfig.panelPaddingX !== undefined ? layoutConfig.panelPaddingX : 8, // px
        panelPaddingY: layoutConfig.panelPaddingY !== undefined ? layoutConfig.panelPaddingY : 6, // px
        
        specialtySpacing: layoutConfig.specialtySpacing !== undefined ? layoutConfig.specialtySpacing : 3, // px
        doctorCardSpacing: layoutConfig.doctorCardSpacing !== undefined ? layoutConfig.doctorCardSpacing : 2.5, // px
        cardPadding: layoutConfig.cardPadding !== undefined ? layoutConfig.cardPadding : 3, // px
        
        // Head and Sub-head Spacing
        headSubheadGap: layoutConfig.headSubheadGap !== undefined ? layoutConfig.headSubheadGap : 2, // px
        headerMarginBottom: layoutConfig.headerMarginBottom !== undefined ? layoutConfig.headerMarginBottom : 4, // px
        headerFontSize: layoutConfig.headerFontSize !== undefined ? layoutConfig.headerFontSize : 13, // px
        headerSubtitleFontSize: layoutConfig.headerSubtitleFontSize !== undefined ? layoutConfig.headerSubtitleFontSize : 7.5, // px
        
        titleFontSize: layoutConfig.titleFontSize !== undefined ? layoutConfig.titleFontSize : 9.5, // px
        doctorFontSize: layoutConfig.doctorFontSize !== undefined ? layoutConfig.doctorFontSize : 8, // px
        scheduleFontSize: layoutConfig.scheduleFontSize !== undefined ? layoutConfig.scheduleFontSize : 7, // px

        // Gambar 2 (Cover BG) Controls
        bgScale: layoutConfig.bgScale !== undefined ? layoutConfig.bgScale : 100, // %
        bgOffsetX: layoutConfig.bgOffsetX !== undefined ? layoutConfig.bgOffsetX : 0, // px
        bgOffsetY: layoutConfig.bgOffsetY !== undefined ? layoutConfig.bgOffsetY : 0, // px
        bgOpacity: layoutConfig.bgOpacity !== undefined ? layoutConfig.bgOpacity : 88, // %

        // Gambar 3 (Middle Panel Phone Mockup) Controls
        image3Scale: layoutConfig.image3Scale !== undefined ? layoutConfig.image3Scale : 100, // %
        image3OffsetX: layoutConfig.image3OffsetX !== undefined ? layoutConfig.image3OffsetX : 0, // px
        image3OffsetY: layoutConfig.image3OffsetY !== undefined ? layoutConfig.image3OffsetY : 0, // px

        // Gambar 1 (Front Cover Image) Controls
        coverImageScale: layoutConfig.coverImageScale !== undefined ? layoutConfig.coverImageScale : 100, // %
        coverImageOffsetX: layoutConfig.coverImageOffsetX !== undefined ? layoutConfig.coverImageOffsetX : 0, // px
        coverImageOffsetY: layoutConfig.coverImageOffsetY !== undefined ? layoutConfig.coverImageOffsetY : 0 // px
    };

    // Calculate Exact Pixel Heights
    const headerHeight = layout.headerFontSize + layout.headSubheadGap + layout.headerSubtitleFontSize + layout.headerMarginBottom + 8;
    const headerGroupH = calculateGroupHeaderPixelHeight(layout);

    let totalDataHeight = 0;
    allData.forEach(spec => {
        totalDataHeight += headerGroupH;
        (spec.doctors || []).forEach(doc => {
            totalDataHeight += calculateDoctorPixelHeight(doc, layout);
        });
    });

    // Total available height in 4 columns (210mm is ~780px printable height)
    // Panel padding Y reduces usable height: 780 - (2 * panelPaddingY)
    const columnUsableHeight = 770 - (layout.panelPaddingY * 2);
    
    // Column 0: Outside Left
    // Column 1: Inside Left (Usable height minus Header)
    // Column 2: Inside Middle
    // Column 3: Inside Right
    const columnCapacities = [
        columnUsableHeight,
        columnUsableHeight - headerHeight,
        columnUsableHeight,
        columnUsableHeight
    ];

    const totalCapacity = columnCapacities.reduce((a, b) => a + b, 0);

    // If total data exceeds capacity, proportionally balance target capacities
    const targetCapacities = columnCapacities.map(cap => Math.floor((cap / totalCapacity) * totalDataHeight));

    const columns = [[], [], [], []];
    let currentColumn = 0;
    let currentColumnHeight = 0;

    allData.forEach((spec, specIdx) => {
        const specHeaderH = calculateGroupHeaderPixelHeight(layout);
        const specDocs = spec.doctors || [];

        // Check if entire group fits in current column
        let groupTotalH = specHeaderH;
        specDocs.forEach(doc => {
            groupTotalH += calculateDoctorPixelHeight(doc, layout);
        });

        const targetCap = targetCapacities[currentColumn] || columnCapacities[currentColumn];
        const remainingSpace = targetCap - currentColumnHeight;

        if (currentColumn < 3 && (currentColumnHeight + groupTotalH > targetCap + 10)) {
            // Check if we can fit at least the header + 1 or more doctors before advancing
            if (remainingSpace < specHeaderH + 30) {
                // Not enough room for header + 1 doctor, move whole group to next column
                currentColumn++;
                currentColumnHeight = 0;
                columns[currentColumn].push(spec);
                currentColumnHeight += groupTotalH;
            } else {
                // Split doctors into 2 parts
                const availableForDocs = remainingSpace - specHeaderH;
                let accumulatedDocH = 0;
                let splitIndex = 0;

                for (let i = 0; i < specDocs.length; i++) {
                    const docH = calculateDoctorPixelHeight(specDocs[i], layout);
                    if (accumulatedDocH + docH <= availableForDocs) {
                        accumulatedDocH += docH;
                        splitIndex = i + 1;
                    } else {
                        break;
                    }
                }

                if (splitIndex > 0 && splitIndex < specDocs.length) {
                    const part1 = {
                        title: spec.title,
                        doctors: specDocs.slice(0, splitIndex)
                    };
                    columns[currentColumn].push(part1);

                    currentColumn++;
                    currentColumnHeight = 0;

                    const part2 = {
                        title: `${spec.title} (Lanjutan)`,
                        doctors: specDocs.slice(splitIndex)
                    };
                    columns[currentColumn].push(part2);
                    
                    let part2H = calculateGroupHeaderPixelHeight(layout);
                    part2.doctors.forEach(doc => {
                        part2H += calculateDoctorPixelHeight(doc, layout);
                    });
                    currentColumnHeight += part2H;
                } else {
                    currentColumn++;
                    currentColumnHeight = 0;
                    columns[currentColumn].push(spec);
                    currentColumnHeight += groupTotalH;
                }
            }
        } else {
            columns[currentColumn].push(spec);
            currentColumnHeight += groupTotalH;
        }
    });

    const [outsideColumn1Data, insideColumn1Data, insideColumn2Data, insideColumn3Data] = columns;

    const [insideRes, outsideRes] = await Promise.all([
        fetch('/brochure-template-inside.html'),
        fetch('/brochure-template-outside.html')
    ]);

    const insideTemplate = await insideRes.text();
    const outsideTemplate = await outsideRes.text();

    const coverImageSrc = coverUrl.startsWith('http') || coverUrl.startsWith('/') || coverUrl.startsWith('data:') ? coverUrl : `/${coverUrl}`;
    const bgImageSrc = bgUrl.startsWith('http') || bgUrl.startsWith('/') || bgUrl.startsWith('data:') ? bgUrl : `/${bgUrl}`;
    const logoSrc = logoUrl.startsWith('http') || logoUrl.startsWith('/') || logoUrl.startsWith('data:') ? logoUrl : `/${logoUrl}`;
    const img3Src = image3Url.startsWith('http') || image3Url.startsWith('/') || image3Url.startsWith('data:') ? image3Url : `/${image3Url}`;
    const img4Src = image4Url.startsWith('http') || image4Url.startsWith('/') || image4Url.startsWith('data:') ? image4Url : `/${image4Url}`;

    // Scale multiplier for globalScale - applied directly to all sizes for print compatibility
    // NOTE: We deliberately do NOT use CSS zoom (unreliable in @media print for Firefox/Edge)
    // Instead we scale all values by the globalScale ratio directly.
    const sc = layout.globalScale / 100;

    // Dynamic Style Injection from Layout & Tuning Controls
    const dynamicCss = `
    <style id="custom-layout-overrides">
        /* Global position offset - applied at sheet level */
        .trifold-sheet {
            transform: translate(${layout.offsetX}px, ${layout.offsetY}px);
        }

        /* Panel padding - scaled */
        .panel {
            padding: ${layout.panelPaddingY * sc}px ${layout.panelPaddingX * sc}px !important;
        }

        /* Header spacing - scaled */
        .header-container {
            margin-bottom: ${layout.headerMarginBottom * sc}px !important;
        }
        .main-header-title {
            font-size: ${layout.headerFontSize * sc}px !important;
            margin-bottom: ${layout.headSubheadGap * sc}px !important;
            line-height: 1.15 !important;
        }
        .main-header-subtitle {
            font-size: ${layout.headerSubtitleFontSize * sc}px !important;
            margin: 0 !important;
            line-height: 1.2 !important;
        }

        /* Specialty group - scaled */
        .specialization-group {
            margin-bottom: ${layout.specialtySpacing * sc}px !important;
        }
        .specialization-title {
            font-size: ${layout.titleFontSize * sc}px !important;
            margin-bottom: ${Math.max(1, (layout.specialtySpacing - 1) * sc)}px !important;
            padding-bottom: ${1.5 * sc}px !important;
        }

        /* Doctor card - scaled */
        .doctor-card {
            padding: ${layout.cardPadding * sc}px ${(layout.cardPadding + 2) * sc}px !important;
            margin-bottom: ${layout.doctorCardSpacing * sc}px !important;
            border-left-width: ${2.5 * sc}px !important;
        }
        .doctor-name {
            font-size: ${layout.doctorFontSize * sc}px !important;
            margin-bottom: ${1 * sc}px !important;
            line-height: 1.2 !important;
        }
        .schedule-grid {
            font-size: ${layout.scheduleFontSize * sc}px !important;
            gap: ${1.5 * sc}px ${4 * sc}px !important;
        }
        .schedule-day {
            font-size: ${layout.scheduleFontSize * sc}px !important;
            padding: ${1 * sc}px ${3 * sc}px !important;
        }

        /* Gambar 2 (Background Cover) Scale & Offset */
        .cover-bg-layer {
            transform: translate(${layout.bgOffsetX}px, ${layout.bgOffsetY}px) scale(${layout.bgScale / 100}) !important;
        }
        .background-overlay {
            background: rgba(255, 255, 255, ${layout.bgOpacity / 100}) !important;
        }

        /* Gambar 3 (Middle Panel Phone Mockup) Unclipped Scale & Offset */
        .image3-img {
            transform: translate(${layout.image3OffsetX}px, ${layout.image3OffsetY}px) scale(${layout.image3Scale / 100}) !important;
        }

        /* Gambar 1 (Cover Depan) Scale & Offset */
        .cover-image {
            transform: translate(${layout.coverImageOffsetX}px, ${layout.coverImageOffsetY}px) scale(${layout.coverImageScale / 100}) !important;
        }

        /* Ensure print output uses same styling - no zoom reliance */
        @media print {
            .trifold-sheet {
                transform: translate(${layout.offsetX}px, ${layout.offsetY}px) !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .cover-bg-layer {
                transform: translate(${layout.bgOffsetX}px, ${layout.bgOffsetY}px) scale(${layout.bgScale / 100}) !important;
            }
            .image3-img {
                transform: translate(${layout.image3OffsetX}px, ${layout.image3OffsetY}px) scale(${layout.image3Scale / 100}) !important;
            }
            .cover-image {
                transform: translate(${layout.coverImageOffsetX}px, ${layout.coverImageOffsetY}px) scale(${layout.coverImageScale / 100}) !important;
            }
        }
    </style>`;

    let insideHtml = insideTemplate
        .replace('</head>', `${dynamicCss}</head>`)
        .replace('Jadwal Poliklinik Dokter Spesialis', texts.insideMainTitle)
        .replace('Siloam Hospitals Ambon', texts.insideSubtitle)
        .replace('{{GENERATED_DATE}}', texts.updateDate)
        .replace('{{COLUMN_1_HTML}}', generateHtmlForRegularDoctors(insideColumn1Data))
        .replace('{{COLUMN_2_HTML}}', generateHtmlForRegularDoctors(insideColumn2Data))
        .replace('{{COLUMN_3_HTML}}', generateHtmlForRegularDoctors(insideColumn3Data));

    let outsideHtml = outsideTemplate
        .replace('</head>', `${dynamicCss}</head>`)
        .replace('{{COLUMN_1_OUTSIDE}}', generateHtmlForRegularDoctors(outsideColumn1Data))
        .replace('{{COVER_IMAGE_SRC}}', coverImageSrc)
        .replace('{{COVER_BACKGROUND_SRC}}', bgImageSrc)
        .replace('{{LOGO_SILOAM_WARNA}}', logoSrc)
        .replace('{{GAMBAR_3_SRC}}', img3Src)
        .replace('{{GAMBAR_4_SRC}}', img4Src);

    // Apply editable text substitutions on outside cover & address
    outsideHtml = outsideHtml
        .replace('<p class="title">Siloam Hospitals Ambon</p>', `<p class="title">${texts.outsideHospitalName}</p>`)
        .replace('<p>Jl. Sultan Hasanudin, Hative Kecil, Kec. Sirimau, Kota Ambon, Maluku</p>', `<p>${texts.outsideAddress}</p>`)
        .replace(/<p>Telp:.*<\/p>/, `<p>${texts.outsidePhone}</p>`)
        .replace(/Jadwal Poliklinik<br>\s*<span style="font-size: 17px; color: #0284c7;">Dokter Spesialis<\/span>/, `${texts.outsideCoverTitle1}<br><span style="font-size: 17px; color: #0284c7;">${texts.outsideCoverTitle2}</span>`)
        .replace('<p style="font-size: 10px; color: #1e293b; margin: 0 0 4px 0; font-weight: 600;">\n                    Siloam Hospitals Ambon\n                </p>', `<p style="font-size: 10px; color: #1e293b; margin: 0 0 4px 0; font-weight: 600;">${texts.outsideCoverHospital}</p>`)
        .replace(/<p style="font-size: 11px; font-weight: 700; color: #192670; margin: 0;">.*<\/p>/, `<p style="font-size: 11px; font-weight: 700; color: #192670; margin: 0;">${texts.outsideCoverYear}</p>`);

    return `${insideHtml}<div style="page-break-after: always;"></div>${outsideHtml}`;
}

// =========================================================================
// EXECUTIVE 2-SIDE BROCHURE ENGINE (Bifold A4 Landscape)
// =========================================================================

export async function fetchExecutiveDoctorGroups() {
    const timestamp = Date.now();

    const fetchJson = async (url) => {
        const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };

    const [execRes, cpRes, genRes] = await Promise.allSettled([
        fetchJson(`${API_BASE}/executive-doctors/grouped`),
        fetchJson(`${API_BASE}/company-profile/data`),
        fetchJson(`${API_BASE}/doctors?limit=200`)
    ]);

    const execData = execRes.status === 'fulfilled' ? execRes.value : {};
    const cpData = cpRes.status === 'fulfilled' ? cpRes.value : {};
    const genData = genRes.status === 'fulfilled' ? genRes.value : {};

    const cpDoctors = (cpData && Array.isArray(cpData.doctors)) ? cpData.doctors : [];
    const photoMap = new Map();
    const generalScheduleMap = new Map();

    cpDoctors.forEach((cpDoc) => {
        if (!cpDoc || !cpDoc.name) return;
        const photoUrl = cpDoc.image_url || cpDoc.image_url_sstv;
        if (photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http')) {
            const k = cleanDoctorName(cpDoc.name);
            if (k) photoMap.set(k, photoUrl);

            const slug = createDoctorSlug(cpDoc.name);
            if (slug) photoMap.set(`slug-${slug}`, photoUrl);
        }

        if (cpDoc.schedule) {
            const k = cleanDoctorName(cpDoc.name);
            if (k) generalScheduleMap.set(k, cpDoc.schedule);
        }
    });

    const rawDocs = Array.isArray(genData) 
        ? genData 
        : (genData.doctors && Array.isArray(genData.doctors) ? genData.doctors : []);

    rawDocs.forEach(doc => {
        if (!doc || !doc.name) return;
        const k = cleanDoctorName(doc.name);
        if (k && doc.schedule) {
            let sched = doc.schedule;
            if (typeof sched === 'string') {
                try { sched = JSON.parse(sched); } catch (e) { sched = {}; }
            }
            if (sched && Object.keys(sched).length > 0) {
                generalScheduleMap.set(k, sched);
            }
        }
        if (doc.image_url && typeof doc.image_url === 'string' && doc.image_url.startsWith('http')) {
            if (k && !photoMap.has(k)) photoMap.set(k, doc.image_url);
        }
    });

    const resolvePhoto = (doc) => {
        if (!doc || !doc.name) return null;
        const k = cleanDoctorName(doc.name);
        const slug = createDoctorSlug(doc.name);

        if (k && photoMap.has(k)) return photoMap.get(k);

        if (k) {
            for (const [cpK, url] of photoMap.entries()) {
                if (!cpK.startsWith('slug-') && (cpK.includes(k) || k.includes(cpK))) {
                    return url;
                }
            }
        }

        if (slug && photoMap.has(`slug-${slug}`)) return photoMap.get(`slug-${slug}`);
        if (doc.image_url && typeof doc.image_url === 'string' && doc.image_url.startsWith('http')) {
            return doc.image_url;
        }
        if (slug) return `/asset/webp/${slug}.webp`;
        return null;
    };

    const resolveSchedule = (doc) => {
        let sched = doc.schedule || {};
        if (typeof sched === 'string') {
            try { sched = JSON.parse(sched); } catch (e) { sched = {}; }
        }

        const hasEntries = extractDoctorScheduleEntries(sched).length > 0;
        if (hasEntries) return sched;

        const k = cleanDoctorName(doc.name);
        if (k && generalScheduleMap.has(k)) {
            return generalScheduleMap.get(k);
        }

        return sched;
    };

    let allGroups = [];

    if (Array.isArray(execData) && execData.length > 0) {
        allGroups = execData.map((group, gIdx) => ({
            id: `group-${gIdx}`,
            title: group.title || group.specialty || group.name || 'Spesialis',
            doctors: (group.doctors || []).map((d, dIdx) => ({
                id: `doc-${gIdx}-${dIdx}-${createDoctorSlug(d.name)}`,
                name: d.name,
                specialty: d.specialty || group.title || '',
                schedule: resolveSchedule(d),
                slug: createDoctorSlug(d.name),
                photoUrl: resolvePhoto(d),
                visible: true
            }))
        })).filter(g => g.doctors && g.doctors.length > 0);
    } else if (execData.doctors && Array.isArray(execData.doctors) && execData.doctors.length > 0) {
        const grouped = {};
        execData.doctors.forEach((doc, idx) => {
            if (!doc || !doc.name || doc.name.trim() === '.' || doc.name.trim() === '') return;
            const spec = doc.specialty || 'Umum';
            if (!grouped[spec]) {
                grouped[spec] = { id: `group-${spec}`, title: spec, doctors: [] };
            }
            grouped[spec].doctors.push({
                id: `doc-${idx}-${createDoctorSlug(doc.name)}`,
                name: doc.name.trim(),
                specialty: spec,
                schedule: resolveSchedule(doc),
                slug: createDoctorSlug(doc.name),
                photoUrl: resolvePhoto(doc),
                visible: true
            });
        });
        allGroups = Object.values(grouped);
    } else if (typeof execData === 'object' && execData !== null && Object.keys(execData).length > 0) {
        allGroups = Object.entries(execData).map(([key, group], gIdx) => {
            const doctorsArr = (group && Array.isArray(group.doctors)) 
                ? group.doctors 
                : (Array.isArray(group) ? group : []);
            return {
                id: `group-${gIdx}-${key}`,
                title: (group && group.title) || (group && group.specialty) || key || 'Spesialis',
                doctors: doctorsArr.map((d, dIdx) => ({
                    id: `doc-${gIdx}-${dIdx}-${createDoctorSlug(d.name)}`,
                    name: d.name,
                    specialty: d.specialty || (group && group.title) || key || '',
                    schedule: resolveSchedule(d),
                    slug: createDoctorSlug(d.name),
                    photoUrl: resolvePhoto(d),
                    visible: true
                }))
            };
        }).filter(g => g.doctors && g.doctors.length > 0);
    }

    const getCategoryScore = (title) => {
        const t = title.toLowerCase();
        if (t.includes('gigi') || t.includes('mulut')) return 10;
        if (t.includes('bedah') || t.includes('orthopaedi') || t.includes('urologi') || t.includes('onkologi')) return 20;
        if (t.includes('kandungan') || t.includes('kebidanan') || t.includes('obgyn') || t.includes('anak')) return 30;
        if (t.includes('penyakit dalam') || t.includes('jantung') || t.includes('paru')) return 40;
        if (t.includes('mata') || t.includes('tht') || t.includes('kulit') || t.includes('saraf') || t.includes('jiwa')) return 50;
        return 100;
    };

    allGroups.sort((a, b) => {
        const scoreA = getCategoryScore(a.title);
        const scoreB = getCategoryScore(b.title);
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.title.localeCompare(b.title);
    });

    return allGroups;
}

function formatExecutiveDoctorCardWithPhoto(doc) {
    const scheduleEntries = extractDoctorScheduleEntries(doc.schedule);

    let scheduleHtml = '';
    if (scheduleEntries.length === 0) {
        scheduleHtml = '<span style="color: #b45309; font-style: italic; font-size: 7.5px; font-weight: 500;">Jadwal dengan perjanjian</span>';
    } else {
        scheduleHtml = scheduleEntries.map(({ day, time }) => `
            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 5px; border-radius: 3px; font-size: 7.5px; display: inline-flex; align-items: center; gap: 3px; line-height: 1.15;">
                <strong style="color: #001f5c; font-weight: 700;">${day}:</strong>
                <span style="color: #0f172a; font-weight: 600;">${time}</span>
            </div>
        `).join('');
    }

    const photoSrc = doc.photoUrl || (doc.slug ? `/asset/webp/${doc.slug}.webp` : null);
    const initials = getInitials(doc.name);

    return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 3.5px solid #f59e0b; border-radius: 6px; padding: 5px 7px; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,31,92,0.04); display: flex; align-items: center; gap: 8px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; overflow: hidden; flex-shrink: 0; border: 1.5px solid #d97706; background: #ffffff; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
                ${photoSrc ? `
                    <img 
                        src="${photoSrc}" 
                        alt="${doc.name}" 
                        style="width: 100%; height: 100%; object-fit: cover; object-position: top center; background: #ffffff;"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    />
                    <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: #ffffff; color: #001f5c; font-weight: 900; font-size: 12px; font-family: 'Montserrat', sans-serif;">
                        ${initials}
                    </div>
                ` : `
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #ffffff; color: #001f5c; font-weight: 900; font-size: 12px; font-family: 'Montserrat', sans-serif;">
                        ${initials}
                    </div>
                `}
            </div>

            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 800; color: #001f5c; font-size: 9px; line-height: 1.25; margin-bottom: 1px;">
                    ${doc.name}
                </div>
                ${doc.specialty ? `
                    <div style="font-size: 7.5px; color: #d97706; font-weight: 700; margin-bottom: 2px;">
                        ${doc.specialty}
                    </div>
                ` : ''}
                <div style="display: flex; flex-wrap: wrap; gap: 3px; margin-top: 2px;">
                    ${scheduleHtml}
                </div>
            </div>
        </div>
    `;
}

export async function buildExecutiveBifoldHtml({ 
    customGroups = null, 
    textConfig = {},
    layoutConfig = {},
    coverUrl = 'asset/brochure/1.png', 
    backLogoUrl = '/asset/logo/logo.png',
    bgUrl = 'asset/brochure/2.png' 
}) {
    const allGroups = (customGroups && customGroups.length > 0)
        ? customGroups
        : await fetchExecutiveDoctorGroups();

    const texts = {
        frontTagline: resolveTextValue(textConfig.frontTagline, 'KLINIK EKSEKUTIF'),
        frontTitle1: resolveTextValue(textConfig.frontTitle1, 'JADWAL PRAKTIK'),
        frontTitle2: resolveTextValue(textConfig.frontTitle2, 'DOKTER SPESIALIS'),
        frontDescription: resolveTextValue(textConfig.frontDescription, 'Direktori jadwal praktik dokter spesialis dan subspesialis klinik eksekutif RSU Siloam Ambon.'),
        frontYear: resolveTextValue(textConfig.frontYear, 'Tahun 2025/2026'),
        frontUpdateDate: resolveTextValue(textConfig.frontUpdateDate, new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })),

        backTitle: resolveTextValue(textConfig.backTitle, 'RSU SILOAM AMBON'),
        backSubtitle: resolveTextValue(textConfig.backSubtitle, 'Pelayanan Kesehatan Berkualitas, Profesional, dan Terpercaya untuk Anda dan Keluarga.'),
        backReservation: resolveTextValue(textConfig.backReservation, '(0911) 3823900 / 0812-4040-3900'),
        backEmergency: resolveTextValue(textConfig.backEmergency, '1-500-911'),
        backAddress: resolveTextValue(textConfig.backAddress, 'Jl. Sultan Hasanudin, Hative Kecil, Kec. Sirimau, Kota Ambon, Maluku'),

        insideLeftTitle: resolveTextValue(textConfig.insideLeftTitle, 'Jadwal Poliklinik Executive'),
        insideRightTitle: resolveTextValue(textConfig.insideRightTitle, 'Jadwal Dokter (Lanjutan)'),
        insideNote: resolveTextValue(textConfig.insideNote, 'Pasien disarankan konfirmasi perjanjian H-1 melalui WA 0812-4040-3900 / MySiloam.')
    };

    const layout = {
        globalScale: layoutConfig.globalScale !== undefined ? layoutConfig.globalScale : 100, // %
        offsetX: layoutConfig.offsetX !== undefined ? layoutConfig.offsetX : 0, // px
        offsetY: layoutConfig.offsetY !== undefined ? layoutConfig.offsetY : 0, // px
        panelPaddingX: layoutConfig.panelPaddingX !== undefined ? layoutConfig.panelPaddingX : 10, // mm
        panelPaddingY: layoutConfig.panelPaddingY !== undefined ? layoutConfig.panelPaddingY : 8, // mm
        specialtySpacing: layoutConfig.specialtySpacing !== undefined ? layoutConfig.specialtySpacing : 5, // px
        doctorCardSpacing: layoutConfig.doctorCardSpacing !== undefined ? layoutConfig.doctorCardSpacing : 5, // px
        cardPadding: layoutConfig.cardPadding !== undefined ? layoutConfig.cardPadding : 5 // px
    };

    const filteredGroups = allGroups.map(g => ({
        ...g,
        doctors: (g.doctors || []).filter(d => d.visible !== false)
    })).filter(g => g.doctors.length > 0);

    const totalDoctors = filteredGroups.reduce((acc, g) => acc + g.doctors.length, 0);
    const halfDoctors = Math.ceil(totalDoctors / 2);

    const insideLeftGroups = [];
    const insideRightGroups = [];
    let currentDocCount = 0;

    filteredGroups.forEach(g => {
        if (currentDocCount < halfDoctors) {
            insideLeftGroups.push(g);
            currentDocCount += g.doctors.length;
        } else {
            insideRightGroups.push(g);
        }
    });

    const renderPanelGroups = (groups) => {
        if (!groups || groups.length === 0) return '<div style="color: #94a3b8; font-size: 8px;">Tidak ada jadwal</div>';
        return groups.map(g => `
            <div style="margin-bottom: ${layout.specialtySpacing}px; break-inside: avoid;">
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px; padding-bottom: 1px; border-bottom: 1.5px solid #d97706;">
                    <span style="width: 4px; height: 4px; border-radius: 50%; background: #f59e0b;"></span>
                    <span style="font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 8.5px; color: #001f5c; text-transform: uppercase; letter-spacing: 0.3px;">
                        ${g.title}
                    </span>
                </div>
                ${g.doctors.map(formatExecutiveDoctorCardWithPhoto).join('')}
            </div>
        `).join('');
    };

    const coverSrc = coverUrl.startsWith('http') || coverUrl.startsWith('/') || coverUrl.startsWith('data:') ? coverUrl : `/${coverUrl}`;
    const logoSrc = backLogoUrl.startsWith('http') || backLogoUrl.startsWith('/') || backLogoUrl.startsWith('data:') ? backLogoUrl : `/${backLogoUrl}`;

    return `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>Brosur Jadwal Praktik Dokter Executive Clinic (White Gold Bifold) - RSU Siloam Ambon</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                @page {
                    size: A4 landscape;
                    margin: 0;
                }
                * {
                    box-sizing: border-box;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Plus Jakarta Sans', 'Poppins', sans-serif;
                    background: #f1f5f9;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                }
                .bifold-sheet {
                    width: 297mm;
                    height: 210mm;
                    background: #ffffff;
                    display: flex;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                    page-break-after: always;
                    flex-shrink: 0;
                    transform: translate(${layout.offsetX}px, ${layout.offsetY}px);
                }
                .bifold-sheet:last-child {
                    page-break-after: auto;
                }
                .bifold-panel {
                    width: 148.5mm;
                    height: 210mm;
                    padding: ${layout.panelPaddingY}mm ${layout.panelPaddingX}mm;
                    box-sizing: border-box;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }
                .fold-line {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 148.5mm;
                    width: 1px;
                    border-left: 1px dashed rgba(0,0,0,0.15);
                    z-index: 30;
                }
                @media print {
                    body {
                        background: none;
                        gap: 0;
                    }
                    .bifold-sheet {
                        box-shadow: none;
                        width: 297mm;
                        height: 210mm;
                    }
                    .fold-line {
                        border-left: 1px dashed rgba(0,0,0,0.08);
                    }
                }
            </style>
        </head>
        <body>

            <!-- SHEET 1: OUTSIDE SPREAD -->
            <div class="bifold-sheet">
                <div class="fold-line"></div>

                <!-- PANEL KIRI LUAR (Back Cover) -->
                <div class="bifold-panel" style="background: #ffffff; border-right: 1px solid #e2e8f0; justify-content: space-between; align-items: center; text-align: center; padding: 12mm 14mm;">
                    <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                        <div style="font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 8.5px; color: #001f5c; letter-spacing: 0.5px;">RSU SILOAM AMBON</div>
                        <div style="font-size: 7.5px; color: #d97706; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Executive Clinic</div>
                    </div>

                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: auto 0; padding: 10px 0; width: 100%;">
                        <div style="max-width: 210px; max-height: 110px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px;">
                            <img 
                                src="${logoSrc}" 
                                alt="Logo RSU Siloam" 
                                style="max-width: 100%; max-height: 95px; object-fit: contain;" 
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                            />
                            <div style="display: none; flex-direction: column; align-items: center;">
                                <div style="font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 26px; color: #001f5c;">
                                    RSU <span style="color: #38bdf8;">Siloam</span>
                                </div>
                                <div style="font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 2px;">AMBON</div>
                            </div>
                        </div>

                        <div style="width: 48px; height: 2.5px; background: #f59e0b; margin: 0 auto 12px auto; border-radius: 2px;"></div>

                        ${texts.backTitle ? `
                            <div style="font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 13px; color: #001f5c; letter-spacing: 0.5px; margin-bottom: 4px;">
                                ${texts.backTitle}
                            </div>
                        ` : ''}

                        ${texts.backSubtitle ? `
                            <div style="font-size: 8px; color: #64748b; max-width: 240px; line-height: 1.4;">
                                ${texts.backSubtitle}
                            </div>
                        ` : ''}
                    </div>

                    <div style="width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px;">
                            <div style="text-align: left;">
                                <div style="font-size: 7px; color: #94a3b8; text-transform: uppercase;">Informasi & Reservasi:</div>
                                <div style="font-weight: 800; font-size: 9.5px; color: #001f5c;">${texts.backReservation}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 7px; color: #94a3b8;">Layanan Darurat:</div>
                                <div style="font-weight: 900; font-size: 10px; color: #dc2626;">📞 ${texts.backEmergency}</div>
                            </div>
                        </div>
                        <div style="font-size: 7px; color: #64748b; line-height: 1.25;">
                            ${texts.backAddress}
                        </div>
                    </div>
                </div>

                <!-- PANEL KANAN LUAR (Front Cover) -->
                <div class="bifold-panel" style="background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 40%, #f4f6fa 100%); color: #001f5c; justify-content: space-between;">
                    <div style="position: absolute; top: -70px; right: -70px; width: 240px; height: 240px; border-radius: 50%; background: radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 70%); pointer-events: none;"></div>
                    <div style="position: absolute; bottom: -70px; left: -70px; width: 240px; height: 240px; border-radius: 50%; background: radial-gradient(circle, rgba(0,31,92,0.06) 0%, transparent 70%); pointer-events: none;"></div>

                    <div style="position: relative; z-index: 10;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 6px; height: 26px;">
                                <img 
                                    src="${logoSrc}" 
                                    alt="Siloam Logo" 
                                    style="height: 100%; max-width: 100px; object-fit: contain;"
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                />
                                <div style="display: none; align-items: center; gap: 4px;">
                                    <span style="font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 14px; color: #001f5c;">RSU</span>
                                    <span style="font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 14px; color: #0284c7;">Siloam</span>
                                    <span style="font-size: 7.5px; color: #64748b; padding-left: 4px; border-left: 1px solid #cbd5e1;">AMBON</span>
                                </div>
                            </div>
                            <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: #001238; padding: 2.5px 8px; border-radius: 10px; font-weight: 900; font-size: 7.5px; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 2px 6px rgba(245,158,11,0.25);">
                                ★ EXECUTIVE CLINIC
                            </div>
                        </div>

                        ${texts.frontTagline ? `
                            <span style="color: #d97706; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">
                                ${texts.frontTagline}
                            </span>
                        ` : ''}

                        ${(texts.frontTitle1 || texts.frontTitle2) ? `
                            <h1 style="font-family: 'Montserrat', sans-serif; font-size: 18px; font-weight: 900; line-height: 1.15; margin: 2px 0 6px 0; color: #001f5c;">
                                ${texts.frontTitle1}${texts.frontTitle1 && texts.frontTitle2 ? '<br>' : ''}
                                ${texts.frontTitle2 ? `<span style="color: #d97706;">${texts.frontTitle2}</span>` : ''}
                            </h1>
                        ` : ''}

                        ${texts.frontDescription ? `
                            <p style="font-size: 8px; color: #475569; line-height: 1.35; margin: 0;">
                                ${texts.frontDescription}
                            </p>
                        ` : ''}
                    </div>

                    <div style="position: relative; z-index: 10; height: 90px; border-radius: 8px; overflow: hidden; border: 1.5px solid rgba(217,119,6,0.35); box-shadow: 0 4px 14px rgba(0,31,92,0.08); margin: 4px 0; background: #ffffff;">
                        <img src="${coverSrc}" alt="Executive Cover" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/asset/brochure/1.png'">
                    </div>

                    <div style="position: relative; z-index: 10; background: #ffffff; border: 1px solid #e2e8f0; border-left: 3.5px solid #f59e0b; border-radius: 6px; padding: 5px 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,31,92,0.04);">
                        <div style="font-size: 7.5px; color: #64748b; font-weight: 500;">${texts.frontYear}</div>
                        <div style="font-size: 8px; font-weight: 800; color: #001f5c;">${texts.frontUpdateDate ? `Update: <span style="color: #d97706;">${texts.frontUpdateDate}</span>` : ''}</div>
                    </div>
                </div>
            </div>

            <!-- SHEET 2: INSIDE SPREAD -->
            <div class="bifold-sheet">
                <div class="fold-line"></div>

                <!-- PANEL KIRI DALAM -->
                <div class="bifold-panel" style="background: #ffffff; border-right: 1px solid #e2e8f0; justify-content: space-between;">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #001f5c; padding-bottom: 3px; margin-bottom: 5px;">
                            <div>
                                <span style="background: #001f5c; color: #fbbf24; padding: 1.5px 5px; border-radius: 3px; font-weight: 800; font-size: 7px; text-transform: uppercase;">
                                    EXECUTIVE CLINIC
                                </span>
                                <h2 style="font-family: 'Montserrat', sans-serif; font-size: 11.5px; font-weight: 900; color: #001f5c; margin: 1px 0 0 0;">
                                    ${texts.insideLeftTitle}
                                </h2>
                            </div>
                            <div style="font-size: 7px; color: #64748b;">
                                ${texts.frontUpdateDate ? `Update: ${texts.frontUpdateDate}` : ''}
                            </div>
                        </div>

                        <div>
                            ${renderPanelGroups(insideLeftGroups)}
                        </div>
                    </div>

                    <div style="font-size: 6.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 2px; text-align: center;">
                        RSU Siloam Ambon &bull; Halaman Dalam 1
                    </div>
                </div>

                <!-- PANEL KANAN DALAM -->
                <div class="bifold-panel" style="background: #ffffff; justify-content: space-between;">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #001f5c; padding-bottom: 3px; margin-bottom: 5px;">
                            <div>
                                <h2 style="font-family: 'Montserrat', sans-serif; font-size: 11.5px; font-weight: 900; color: #001f5c; margin: 0;">
                                    ${texts.insideRightTitle}
                                </h2>
                            </div>
                            <div style="font-size: 7px; color: #64748b;">
                                RSU Siloam Ambon
                            </div>
                        </div>

                        <div>
                            ${renderPanelGroups(insideRightGroups)}
                        </div>
                    </div>

                    ${texts.insideNote ? `
                        <div style="background: #fffdfa; border: 1px solid #fde68a; border-radius: 4px; padding: 3px 6px; font-size: 7px; color: #78350f;">
                            <strong style="color: #92400e;">Konfirmasi Jadwal:</strong>
                            ${texts.insideNote}
                        </div>
                    ` : ''}
                </div>
            </div>

        </body>
        </html>
    `;
}

export async function buildBrochureHtml({ 
    type = 'regular', 
    customGroups = null, 
    textConfig = {},
    layoutConfig = {},
    coverUrl = 'asset/brochure/1.png', 
    backLogoUrl = '/asset/logo/logo.png',
    bgUrl = 'asset/brochure/2.png',
    logoUrl = '/asset/logo/logo.png',
    image3Url = '/asset/brochure/3.png',
    image4Url = '/asset/brochure/4.png'
}) {
    if (type === 'executive') {
        return buildExecutiveBifoldHtml({ customGroups, textConfig, layoutConfig, coverUrl, backLogoUrl, bgUrl });
    }

    return buildRegularBrochureHtml({ customGroups, textConfig, layoutConfig, coverUrl, bgUrl, logoUrl, image3Url, image4Url });
}
