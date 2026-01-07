import { useState, useEffect } from 'react';
import { createDoctorSlug } from '../utils/helpers';

// Reverting to absolute URLs to bypass local proxy issues
// Using local Netlify functions connected to Neon DB
const GOOGLE_SCRIPT_JADWAL_URL = '/.netlify/functions/getDoctors';
const GOOGLE_SCRIPT_CUTI_URL = '/.netlify/functions/getLeaveData';

// Note: Ensure CORS is allowed on dashboarddev.netlify.app for localhost:5173
// If CORS fails, we must rely on Proxy. But User explicitly requested these URLs.

export function useFetchDoctors() {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [jadwalRes, cutiRes] = await Promise.all([
                    fetch(`${GOOGLE_SCRIPT_JADWAL_URL}?t=${new Date().getTime()}`),
                    fetch(`${GOOGLE_SCRIPT_CUTI_URL}?t=${new Date().getTime()}`)
                ]);

                const jadwalText = await jadwalRes.text();
                const cutiText = await cutiRes.text();

                // console.log("Jadwal Raw:", jadwalText);
                // console.log("Cuti Raw:", cutiText);

                const jadwalData = (() => { try { return JSON.parse(jadwalText); } catch (e) { return null; } })();
                const cutiData = (() => { try { return JSON.parse(cutiText); } catch (e) { return null; } })();

                if (!jadwalData || !cutiData) throw new Error("Invalid Data or Parse Error");

                const allDoctors = new Map();
                for (const key in jadwalData) {
                    if (jadwalData[key] && Array.isArray(jadwalData[key].doctors)) {
                        jadwalData[key].doctors.forEach(doc => {
                            if (!doc || !doc.name) return;
                            const doctorKey = createDoctorSlug(doc.name);
                            const imageUrl = doc.image_url || 'https://placehold.co/200x200/e2e8f0/475569?text=No+Photo';
                            if (!allDoctors.has(doctorKey)) {
                                allDoctors.set(doctorKey, {
                                    nama: doc.name,
                                    spesialis: jadwalData[key].title,
                                    fotourl: imageUrl
                                });
                            }
                        });
                    }
                }

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const processedCuti = cutiRes.ok ? cutiData.map((cuti, index) => {
                    const endDateParts = cuti.TanggalSelesaiCuti.split('-'); // dd-MM-yyyy
                    if (endDateParts.length !== 3) return null;
                    const endDate = new Date(endDateParts[2], endDateParts[1] - 1, endDateParts[0]);
                    if (endDate < today) return null;

                    const doctorKey = createDoctorSlug(cuti.NamaDokter);
                    const details = allDoctors.get(doctorKey);

                    return {
                        id: `doc-${index}`,
                        nama: details ? details.nama : cuti.NamaDokter,
                        cutiMulai: cuti.TanggalMulaiCuti,
                        cutiSelesai: cuti.TanggalSelesaiCuti,
                        spesialis: details ? details.spesialis : 'N/A',
                        fotourl: details ? details.fotourl : 'https://placehold.co/200x200/e2e8f0/475569?text=No+Photo'
                    };
                }).filter(Boolean) : [];

                console.log('[FRONTEND DEBUG] Sample doctor data:', processedCuti.slice(0, 2));

                // Sort Logic: Name ASC, then Start Date ASC
                processedCuti.sort((a, b) => {
                    // 1. Sort by Name (for grouping same names)
                    const nameA = a.nama.toLowerCase();
                    const nameB = b.nama.toLowerCase();
                    if (nameA < nameB) return -1;
                    if (nameA > nameB) return 1;

                    // 2. Sort by Date (cutiMulai: dd-mm-yyyy) - Robust Parsing
                    const parseDateVal = (dateStr) => {
                        if (!dateStr) return 0;
                        const parts = dateStr.split('-').map(Number);
                        // y, m-1, d
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
                console.error(err);
                setError(err);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { doctors, loading, error };
}
