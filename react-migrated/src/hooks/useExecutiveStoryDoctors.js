import { useState, useEffect, useCallback } from 'react';
import { createDoctorSlug, DAYS_LIST } from '../utils/imageHelper';

const API_BASE = 'https://dashdev2.netlify.app/.netlify/functions/api';

// Helper to normalize doctor name for robust cross-table matching
function cleanName(n) {
    if (!n) return '';
    let c = n.toLowerCase();
    c = c.replace(/^(dr\.|drg\.|dr |drg |dr\.\s*dr\.|dr\s+|drg\s+)/gi, '');
    c = c.split(',')[0].trim();
    c = c.replace(/\b[a-z]\b/g, '').trim(); // Remove standalone single initials like 'i'
    c = c.replace(/[^a-z0-9]/g, '');
    return c;
}

export function useExecutiveStoryDoctors() {
    const [executiveDoctors, setExecutiveDoctors] = useState([]);
    const [allDoctors, setAllDoctors] = useState([]);
    const [leaveData, setLeaveData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const timestamp = Date.now();
            const fetchJson = async (url) => {
                const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`);
                if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
                return res.json();
            };

            // Fetch Executive Doctors, Company Profile (Slideshow), General Doctors, and Leave Data
            const [execRes, cpRes, docsRes, leaveRes] = await Promise.allSettled([
                fetchJson(`${API_BASE}/executive-doctors/grouped`),
                fetchJson(`${API_BASE}/company-profile/data`),
                fetchJson(`${API_BASE}/doctors?limit=200`),
                fetchJson(`${API_BASE}/doctors/on-leave`)
            ]);

            const execData = execRes.status === 'fulfilled' ? execRes.value : {};
            const cpData = cpRes.status === 'fulfilled' ? cpRes.value : {};
            const generalDocsData = docsRes.status === 'fulfilled' ? docsRes.value : {};
            const leaveArr = leaveRes.status === 'fulfilled' ? leaveRes.value : [];

            // ========================================================
            // 1. BUILD SLIDESHOW PHOTO MAP BY CLEAN DOCTOR NAME
            // ========================================================
            const cpDoctors = (cpData && Array.isArray(cpData.doctors)) ? cpData.doctors : [];
            const slideshowPhotoMap = new Map();

            cpDoctors.forEach((cpDoc) => {
                if (!cpDoc || !cpDoc.name) return;
                const photoUrl = cpDoc.image_url || cpDoc.image_url_sstv;
                if (photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http')) {
                    const k = cleanName(cpDoc.name);
                    if (k) slideshowPhotoMap.set(k, photoUrl);

                    const slug = createDoctorSlug(cpDoc.name);
                    if (slug) slideshowPhotoMap.set(`slug-${slug}`, photoUrl);
                }
            });

            // Helper to get matching slideshow photo
            const findSlideshowPhoto = (doc) => {
                if (!doc || !doc.name) return doc?.image_url || null;
                const k = cleanName(doc.name);
                const slug = createDoctorSlug(doc.name);

                // Exact clean name match in slideshow
                if (k && slideshowPhotoMap.has(k)) {
                    return slideshowPhotoMap.get(k);
                }

                // Partial name match in slideshow
                if (k) {
                    for (const [cpK, url] of slideshowPhotoMap.entries()) {
                        if (!cpK.startsWith('slug-') && (cpK.includes(k) || k.includes(cpK))) {
                            return url;
                        }
                    }
                }

                // Slug match
                if (slug && slideshowPhotoMap.has(`slug-${slug}`)) {
                    return slideshowPhotoMap.get(`slug-${slug}`);
                }

                // If doc already has a Cloudinary image URL
                if (doc.image_url && typeof doc.image_url === 'string' && doc.image_url.includes('cloudinary.com')) {
                    return doc.image_url;
                }

                // Local WebP fallback
                if (slug) {
                    return `/asset/webp/${slug}.webp`;
                }

                return doc.image_url || null;
            };

            // ========================================================
            // 2. MAP LEAVE DATA
            // ========================================================
            const leaveMap = new Map();
            if (Array.isArray(leaveArr)) {
                leaveArr.forEach(l => {
                    const docName = l.NamaDokter || l.name || l.doctor_name || '';
                    if (docName) {
                        const k = cleanName(docName);
                        leaveMap.set(k, {
                            doctorName: docName,
                            startDate: l.TanggalMulaiCuti || l.start_date,
                            endDate: l.TanggalSelesaiCuti || l.end_date,
                            specialty: l.Spesialis || l.specialty
                        });
                    }
                });
            }
            setLeaveData(leaveArr);

            // ========================================================
            // 3. PROCESS EXECUTIVE DOCTORS
            // ========================================================
            const execList = [];
            if (execData && typeof execData === 'object') {
                Object.entries(execData).forEach(([key, group]) => {
                    if (group && Array.isArray(group.doctors)) {
                        group.doctors.forEach((doc, idx) => {
                            if (!doc || !doc.name) return;

                            const rawSched = doc.schedule || {};
                            const normalizedSchedule = {};
                            DAYS_LIST.forEach(d => {
                                const val = rawSched[d] || rawSched[d.toLowerCase()] || rawSched[d.toUpperCase()] || '';
                                normalizedSchedule[d] = typeof val === 'string' ? val.trim() : (val && val.jam ? val.jam.trim() : '');
                            });

                            const k = cleanName(doc.name);
                            const slug = createDoctorSlug(doc.name);
                            const onLeave = leaveMap.has(k) ? leaveMap.get(k) : null;
                            const finalPhoto = findSlideshowPhoto(doc);

                            execList.push({
                                id: `exec-${doc.id || idx}-${slug}`,
                                rawId: doc.id,
                                name: doc.name.trim(),
                                specialty: doc.specialty || group.specialty || group.title || 'Spesialis',
                                specialtyCategory: group.title || group.specialty || 'Executive Clinic',
                                image_url: finalPhoto,
                                schedule: normalizedSchedule,
                                isExecutive: true,
                                leaveInfo: onLeave,
                                isOnLeave: Boolean(onLeave)
                            });
                        });
                    }
                });
            }

            // ========================================================
            // 4. PROCESS ALL DOCTORS (Slideshow + General Docs)
            // ========================================================
            const combinedMap = new Map();

            // Add pure slideshow doctors
            cpDoctors.forEach((cpDoc) => {
                if (!cpDoc || !cpDoc.name) return;
                const k = cleanName(cpDoc.name);
                const slug = createDoctorSlug(cpDoc.name);
                const photo = findSlideshowPhoto(cpDoc);
                const onLeave = leaveMap.has(k) ? leaveMap.get(k) : null;

                const rawSched = cpDoc.schedule || {};
                const normalizedSchedule = {};
                DAYS_LIST.forEach(d => {
                    const val = rawSched[d] || rawSched[d.toLowerCase()] || '';
                    normalizedSchedule[d] = typeof val === 'string' ? val.trim() : (val && val.jam ? val.jam.trim() : '');
                });

                combinedMap.set(k, {
                    id: `cp-${cpDoc.id || slug}`,
                    rawId: cpDoc.id,
                    name: cpDoc.name.trim(),
                    specialty: cpDoc.specialty || cpDoc.department || 'Dokter Spesialis',
                    specialtyCategory: cpDoc.specialty || 'Spesialis',
                    image_url: photo,
                    schedule: normalizedSchedule,
                    isExecutive: false,
                    leaveInfo: onLeave,
                    isOnLeave: Boolean(onLeave)
                });
            });

            // Add/merge general docs
            const rawDocs = Array.isArray(generalDocsData)
                ? generalDocsData
                : (generalDocsData.doctors && Array.isArray(generalDocsData.doctors) ? generalDocsData.doctors : []);

            rawDocs.forEach((doc, idx) => {
                if (!doc || !doc.name) return;
                const k = cleanName(doc.name);
                const slug = createDoctorSlug(doc.name);
                const photo = findSlideshowPhoto(doc);
                const onLeave = leaveMap.has(k) ? leaveMap.get(k) : null;

                let parsedSchedule = {};
                try {
                    if (typeof doc.schedule === 'string') {
                        parsedSchedule = JSON.parse(doc.schedule);
                    } else if (doc.schedule) {
                        parsedSchedule = doc.schedule;
                    }
                } catch (e) {
                    parsedSchedule = {};
                }

                const normalizedSchedule = {};
                DAYS_LIST.forEach(d => {
                    const val = parsedSchedule[d] || parsedSchedule[d.toLowerCase()] || '';
                    normalizedSchedule[d] = typeof val === 'string' ? val.trim() : (val && val.jam ? val.jam.trim() : '');
                });

                if (combinedMap.has(k)) {
                    const existing = combinedMap.get(k);
                    combinedMap.set(k, {
                        ...existing,
                        schedule: Object.values(normalizedSchedule).some(Boolean) ? normalizedSchedule : existing.schedule,
                        image_url: photo || existing.image_url
                    });
                } else {
                    combinedMap.set(k, {
                        id: `doc-${doc.id || idx}-${slug}`,
                        rawId: doc.id,
                        name: doc.name.trim(),
                        specialty: doc.specialty || 'Dokter Spesialis',
                        specialtyCategory: doc.specialty || 'Umum',
                        image_url: photo,
                        schedule: normalizedSchedule,
                        isExecutive: false,
                        leaveInfo: onLeave,
                        isOnLeave: Boolean(onLeave)
                    });
                }
            });

            const allList = Array.from(combinedMap.values());

            // Sort alphabetical
            execList.sort((a, b) => a.name.localeCompare(b.name));
            allList.sort((a, b) => a.name.localeCompare(b.name));

            setExecutiveDoctors(execList);
            setAllDoctors(allList.length > 0 ? allList : execList);
        } catch (err) {
            console.error('[useExecutiveStoryDoctors] Error:', err);
            setError(err.message || 'Gagal memuat data dokter');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        executiveDoctors,
        allDoctors,
        leaveData,
        loading,
        error,
        refetch: fetchData
    };
}
