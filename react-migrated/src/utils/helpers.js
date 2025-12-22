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
    const [day, month, year] = dateStr.split('-');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
}
