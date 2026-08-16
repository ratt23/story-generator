export function createDoctorSlug(doctorName) {
    if (!doctorName) return '';
    return doctorName
        .toLowerCase()
        .replace(/\b(dr|drg)\b\.?\s*/g, '')
        .replace(/\bsp\.[a-z]+\b/gi, '')
        .replace(/\bm\.[a-z]+\b/gi, '')
        .replace(/\bsubsp\.[a-z]+\b/gi, '')
        .replace(/[.,()]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

export function formatFullDate(dateStr) {
    if (!dateStr) return '';
    let cleanStr = String(dateStr).trim();
    if (cleanStr.includes('T')) {
        cleanStr = cleanStr.split('T')[0];
    }
    let day, month, year;
    if (cleanStr.includes('-')) {
        const parts = cleanStr.split('-');
        if (parts[0].length === 4) {
            // YYYY-MM-DD
            [year, month, day] = parts;
        } else {
            // DD-MM-YYYY
            [day, month, year] = parts;
        }
    } else {
        return cleanStr;
    }
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const mIndex = parseInt(month, 10) - 1;
    if (isNaN(mIndex) || mIndex < 0 || mIndex > 11) return cleanStr;
    return `${parseInt(day, 10)} ${months[mIndex]} ${year}`;
}
