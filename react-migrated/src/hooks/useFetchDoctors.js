import { useState, useEffect } from 'react';
import { createDoctorSlug } from '../utils/helpers';

// API Endpoints on dashdev2.netlify.app
const DOCTORS_API_URL = 'https://dashdev2.netlify.app/.netlify/functions/api/doctors';
const LEAVE_API_URL = 'https://dashdev2.netlify.app/.netlify/functions/api/leave';

export function useFetchDoctors() {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const timestamp = new Date().getTime();
                const [doctorsRes, leaveRes] = await Promise.all([
                    fetch(`${DOCTORS_API_URL}?t=${timestamp}`),
                    fetch(`${LEAVE_API_URL}?t=${timestamp}`)
                ]);

                if (!doctorsRes.ok) throw new Error(`Gagal mengambil data dokter (${doctorsRes.status})`);
                if (!leaveRes.ok) throw new Error(`Gagal mengambil data cuti (${leaveRes.status})`);

                const doctorsData = await doctorsRes.json();
                const leaveData = await leaveRes.json();

                // Extract doctors list (supports { doctors: [...] } or direct array or legacy grouped object)
                const doctorList = Array.isArray(doctorsData)
                    ? doctorsData
                    : (doctorsData.doctors && Array.isArray(doctorsData.doctors))
                        ? doctorsData.doctors
                        : Object.values(doctorsData).flatMap(group => (group && Array.isArray(group.doctors)) ? group.doctors.map(d => ({ ...d, specialty: group.title })) : []);

                // Maps for matching by id and by slug/normalized name
                const doctorById = new Map();
                const doctorBySlug = new Map();

                doctorList.forEach(doc => {
                    if (!doc) return;
                    const docName = doc.name || doc.nama || '';
                    if (doc.id) {
                        doctorById.set(doc.id, doc);
                    }
                    if (docName) {
                        const slug = createDoctorSlug(docName);
                        if (slug) doctorBySlug.set(slug, doc);
                    }
                });

                // Extract leave list
                const leaveList = Array.isArray(leaveData)
                    ? leaveData
                    : (leaveData.leaves && Array.isArray(leaveData.leaves))
                        ? leaveData.leaves
                        : (leaveData.data && Array.isArray(leaveData.data))
                            ? leaveData.data
                            : [];

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const formatToDDMMYYYY = (dStr) => {
                    if (!dStr) return '';
                    let clean = String(dStr).trim();
                    if (clean.includes('T')) clean = clean.split('T')[0];
                    if (clean.includes('-')) {
                        const parts = clean.split('-');
                        if (parts[0].length === 4) {
                            // YYYY-MM-DD -> DD-MM-YYYY
                            return `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                        return clean;
                    }
                    return clean;
                };

                const parseToDate = (dStr) => {
                    if (!dStr) return null;
                    let clean = String(dStr).trim();
                    if (clean.includes('T') || clean.match(/^\d{4}-\d{2}-\d{2}/)) {
                        return new Date(clean);
                    }
                    if (clean.includes('-')) {
                        const parts = clean.split('-');
                        // DD-MM-YYYY
                        return new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0]);
                    }
                    return new Date(clean);
                };

                const processedCuti = leaveList.map((cuti, index) => {
                    const startDateRaw = cuti.start_date || cuti.TanggalMulaiCuti || '';
                    const endDateRaw = cuti.end_date || cuti.TanggalSelesaiCuti || '';
                    const doctorNameRaw = cuti.doctor_name || cuti.NamaDokter || cuti.name || '';

                    const endDate = parseToDate(endDateRaw);
                    if (!endDate || isNaN(endDate.getTime())) return null;

                    // Filter out expired leave
                    if (endDate < today) return null;

                    // Find doctor information
                    let matchedDoc = null;
                    if (cuti.doctor_id && doctorById.has(cuti.doctor_id)) {
                        matchedDoc = doctorById.get(cuti.doctor_id);
                    } else if (doctorNameRaw) {
                        const slug = createDoctorSlug(doctorNameRaw);
                        if (slug && doctorBySlug.has(slug)) {
                            matchedDoc = doctorBySlug.get(slug);
                        }
                    }

                    const finalName = (matchedDoc && (matchedDoc.name || matchedDoc.nama))
                        ? (matchedDoc.name || matchedDoc.nama).trim()
                        : doctorNameRaw.trim();

                    const finalSpecialty = (matchedDoc && matchedDoc.specialty)
                        ? matchedDoc.specialty
                        : (cuti.specialty || 'N/A');

                    const finalPhoto = (matchedDoc && matchedDoc.image_url)
                        ? matchedDoc.image_url
                        : (matchedDoc && matchedDoc.fotourl)
                            ? matchedDoc.fotourl
                            : 'https://placehold.co/200x200/e2e8f0/475569?text=No+Photo';

                    return {
                        id: `doc-${cuti.id || index}`,
                        nama: finalName,
                        cutiMulai: formatToDDMMYYYY(startDateRaw),
                        cutiSelesai: formatToDDMMYYYY(endDateRaw),
                        spesialis: finalSpecialty,
                        fotourl: finalPhoto
                    };
                }).filter(Boolean);

                // Sort Logic: Name ASC, then Start Date ASC
                processedCuti.sort((a, b) => {
                    const nameA = a.nama.toLowerCase();
                    const nameB = b.nama.toLowerCase();
                    if (nameA < nameB) return -1;
                    if (nameA > nameB) return 1;

                    const parseDateVal = (dateStr) => {
                        if (!dateStr) return 0;
                        const parts = dateStr.split('-').map(Number);
                        if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
                        return 0;
                    };

                    const timeA = parseDateVal(a.cutiMulai);
                    const timeB = parseDateVal(b.cutiMulai);
                    return timeA - timeB;
                });

                setDoctors(processedCuti);
                setLoading(false);
            } catch (err) {
                console.error('[useFetchDoctors] Error:', err);
                setError(err);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { doctors, loading, error };
}
