/**
 * Image helper utility for safely loading and converting images to base64 data URLs
 * to ensure html2canvas can capture them without CORS / tainted canvas errors.
 */

// Helper to convert doctor name to URL-friendly slug matching local webp files
export const createDoctorSlug = (name) => {
    if (!name) return '';
    let clean = name.toLowerCase();
    // Remove titles & degrees
    clean = clean.replace(/^(dr\.|drg\.|dr |drg )/g, '');
    clean = clean.replace(/,\s*(sh|mhkes|mars|spa|sppd|spb|spog|spn|spjp|sptht|spm|span|spkfr|fics|finacs|fiatcvs|subsp.*|k-.*|biomed.*)/gi, '');
    clean = clean.replace(/[^a-z0-9\s-]/g, '');
    clean = clean.trim().replace(/\s+/g, '-');
    return clean;
};

// Helper to get initials if photo is unavailable
export const getDoctorInitials = (name) => {
    if (!name) return 'DR';
    let clean = name.replace(/^(Dr\.|dr\.|drg\.)\s*/i, '').trim();
    clean = clean.split(',')[0].trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'DR';
};

// Convert image URL to Data URL (base64) using fetch & FileReader
export const convertUrlToDataUrl = async (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;

    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(url);
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.warn('[imageHelper] Could not convert image to data URL:', url, err);
        return url;
    }
};

// Map of standard days in Indonesian
export const DAYS_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
