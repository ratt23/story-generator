import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useExecutiveStoryDoctors } from '../hooks/useExecutiveStoryDoctors';
import { createDoctorSlug, DAYS_LIST } from '../utils/imageHelper';

const ExecutiveDailyStoryContext = createContext(null);

const PHOTO_SETTINGS_STORAGE_KEY = 'executive_daily_story_doctor_photos_v1';
const CONFIG_STORAGE_KEY = 'eds_layout_config_v1';

// Load saved config from localStorage, merged with DEFAULT_CONFIG so new keys always exist
const loadSavedConfig = (defaults) => {
    try {
        const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (!raw) return defaults;
        return { ...defaults, ...JSON.parse(raw) };
    } catch (e) {
        console.warn('[ExecutiveDailyStory] Failed to load config from localStorage', e);
        return defaults;
    }
};

// Helper to get stored photo adjustments from localStorage
const getStoredPhotoSettings = () => {
    try {
        const raw = localStorage.getItem(PHOTO_SETTINGS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.warn('[ExecutiveDailyStory] Failed to load photo settings from localStorage', e);
        return {};
    }
};

// Helper to save a single doctor's photo adjustment to localStorage
const saveDoctorPhotoSetting = (doctorKey, settings) => {
    try {
        if (!doctorKey) return;
        const current = getStoredPhotoSettings();
        current[doctorKey] = {
            ...(current[doctorKey] || {}),
            ...settings
        };
        localStorage.setItem(PHOTO_SETTINGS_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
        console.warn('[ExecutiveDailyStory] Failed to save photo setting to localStorage', e);
    }
};

// Helper to bulk save all doctor photo adjustments to localStorage
const saveBulkDoctorPhotoSettings = (doctorsList) => {
    try {
        const current = getStoredPhotoSettings();
        doctorsList.forEach(doc => {
            const key = createDoctorSlug(doc.name) || doc.id;
            if (key) {
                current[key] = {
                    photoScale: doc.photoScale !== undefined ? doc.photoScale : 0.75,
                    photoOffsetX: doc.photoOffsetX !== undefined ? doc.photoOffsetX : 0,
                    photoOffsetY: doc.photoOffsetY !== undefined ? doc.photoOffsetY : 3,
                    photoRotate: doc.photoRotate !== undefined ? doc.photoRotate : 0,
                    photoFlipX: doc.photoFlipX !== undefined ? doc.photoFlipX : false,
                    avatar: doc.avatar
                };
            }
        });
        localStorage.setItem(PHOTO_SETTINGS_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
        console.warn('[ExecutiveDailyStory] Failed to save bulk photo settings to localStorage', e);
    }
};

const DEFAULT_CONFIG = {
    // 1. Logo
    showLogo: true,
    logoUrl: '/asset2/webp/logo.webp',
    logoScale: 1.0,
    logoOffsetX: 0,
    logoOffsetY: 0,
    logoHeight: 52,

    // 2. Title "EXECUTIVE Clinic"
    showTitle: true,
    headerTitleUrl: '/asset2/webp/1.webp',
    headerScale: 1.0,
    headerOffsetX: 0,
    headerOffsetY: 0,
    headerWidth: 720,

    // 3. Day Badge
    showDayBadge: true,
    customDayBadge: '',
    dayBadgeScale: 1.0,
    dayBadgeOffsetX: 0,
    dayBadgeOffsetY: 0,
    dayBadgeBgColor: '#001f5c',
    dayBadgeTextColor: '#ffffff',
    dayBadgeFontSize: 28,

    // 4. Schedule Table Card
    showTable: true,
    tableScale: 1.0,
    tableOffsetX: 0,
    tableOffsetY: 0,
    tableWidth: 960,
    tableHeaderHeight: 70,
    tableHeaderFontSize: 26,
    tableHeaderBgColor: '#001f5c',
    tableHeaderTextColor: '#ffffff',
    tableTitleName: 'Nama Dokter',
    tableTitleSchedule: 'Jadwal',
    cardBgColor: '#ffffff',
    cardBlur: 0,
    cardOpacity: 1.0,
    cardBorderWidth: 1.5,
    cardBorderColor: 'rgba(255, 255, 255, 0.9)',
    tablePaddingY: 12,
    tablePaddingX: 28,

    // 5. Doctor Typography & Row Layout
    nameFontSize: 20,
    specialtyFontSize: 13,
    timeFontSize: 20,
    avatarSize: 64,
    rowSpacing: 10,
    nameColor: '#001f5c',
    specialtyColor: '#475569',
    timeColor: '#001f5c',

    // 6. Footers
    showFooters: true,
    footerKiriUrl: '/asset2/webp/footer kiri.webp',
    footerKiriScale: 1.0,
    footerKiriOffsetX: 0,
    footerKiriOffsetY: 0,
    footerKananUrl: '/asset2/webp/footer kanan.webp',
    footerKananScale: 1.0,
    footerKananOffsetX: 0,
    footerKananOffsetY: 0,

    // 7. Video Settings
    bgVideoUrl: '/asset2/Background.webm',
    videoBrightness: 100,
    videoContrast: 100,
    videoSaturate: 100,
    overlayDarkness: 0,

    // 8. Animation Settings (Canva Style)
    tableAnimation: 'pan-right',     // 'pan-right' | 'pan-left' | 'rise' | 'drop' | 'fade' | 'pop' | 'none'
    dayBadgeAnimation: 'rise',       // 'rise' | 'drop' | 'pan-right' | 'pan-left' | 'fade' | 'pop' | 'none'
    titleAnimation: 'fade',          // 'fade' | 'drop' | 'pop' | 'none'
    logoAnimation: 'fade',           // 'fade' | 'drop' | 'none'
    footersAnimation: 'fade',        // 'fade' | 'rise' | 'none'
    animationDuration: 0.8,          // in seconds
    animationDelayBadge: 0.15,       // in seconds
    animationDelayTable: 0.35,       // in seconds
    animationDelayFooters: 0.55,     // in seconds
};

// Helper to format specialty with 'Dokter Spesialis' prefix if not present
function normalizeSpecialty(raw) {
    if (!raw) return 'Dokter Spesialis';
    let s = raw.trim();
    if (/^(dokter spesialis|spesialis)/i.test(s)) {
        return s;
    }
    return `Dokter Spesialis ${s}`;
}

export const ExecutiveDailyStoryProvider = ({ children }) => {
    const { executiveDoctors, allDoctors, loading, error, refetch } = useExecutiveStoryDoctors();
    const [selectedDay, setSelectedDay] = useState('Sabtu');
    const [dailyDoctors, setDailyDoctors] = useState([]);
    const [config, setConfig] = useState(() => loadSavedConfig(DEFAULT_CONFIG));
    const [hasManualEdits, setHasManualEdits] = useState(false);
    const [animationKey, setAnimationKey] = useState(1);

    // Build day-based doctor list from fetched executiveDoctors with persistent photo settings
    const generateDoctorsForDay = useCallback((day, docList) => {
        const list = (docList && docList.length > 0) ? docList : executiveDoctors;
        if (!list || list.length === 0) return [];

        const storedSettings = getStoredPhotoSettings();

        const matched = [];
        list.forEach((doc, idx) => {
            const rawSched = doc.schedule || {};
            const timeStr = rawSched[day] || rawSched[day.toLowerCase()] || rawSched[day.toUpperCase()] || '';
            const hasSchedule = Boolean(timeStr && timeStr.trim() !== '' && timeStr.trim() !== '-');

            const slug = createDoctorSlug(doc.name);
            const customSetting = storedSettings[slug] || storedSettings[doc.name] || {};

            const avatar = customSetting.avatar || doc.image_url || (slug ? `/asset/webp/${slug}.webp` : null);

            matched.push({
                id: doc.id || `doc-${idx}-${slug}`,
                name: doc.name,
                specialty: normalizeSpecialty(doc.specialty),
                time: hasSchedule ? timeStr.trim() : '14:00–17:00',
                avatar: avatar,
                enabled: hasSchedule,
                isExecutive: doc.isExecutive !== false,
                // Inherit stored custom photo settings if available, else standard preset (Zoom 75%, Y 3%)
                photoScale: customSetting.photoScale !== undefined ? customSetting.photoScale : 0.75,
                photoOffsetX: customSetting.photoOffsetX !== undefined ? customSetting.photoOffsetX : 0,
                photoOffsetY: customSetting.photoOffsetY !== undefined ? customSetting.photoOffsetY : 3,
                photoRotate: customSetting.photoRotate !== undefined ? customSetting.photoRotate : 0,
                photoFlipX: customSetting.photoFlipX !== undefined ? customSetting.photoFlipX : false
            });
        });

        // Put enabled ones first, then alphabetical
        matched.sort((a, b) => {
            if (a.enabled && !b.enabled) return -1;
            if (!a.enabled && b.enabled) return 1;
            return a.name.localeCompare(b.name);
        });

        return matched;
    }, [executiveDoctors]);

    // Initial load & day change sync
    useEffect(() => {
        if (executiveDoctors.length > 0 && (!dailyDoctors.length || !hasManualEdits)) {
            const initialList = generateDoctorsForDay(selectedDay, executiveDoctors);
            setDailyDoctors(initialList);
        }
    }, [executiveDoctors, selectedDay, generateDoctorsForDay, hasManualEdits, dailyDoctors.length]);

    // All Executive Doctors Master Catalog with their current saved photo settings
    const allExecutiveDoctorsList = useMemo(() => {
        const stored = getStoredPhotoSettings();
        return (executiveDoctors || []).map((doc, idx) => {
            const slug = createDoctorSlug(doc.name);
            const customSetting = stored[slug] || stored[doc.name] || {};
            const avatar = customSetting.avatar || doc.image_url || (slug ? `/asset/webp/${slug}.webp` : null);

            return {
                id: doc.id || `master-doc-${idx}-${slug}`,
                name: doc.name,
                specialty: normalizeSpecialty(doc.specialty),
                slug: slug,
                avatar: avatar,
                photoScale: customSetting.photoScale !== undefined ? customSetting.photoScale : 0.75,
                photoOffsetX: customSetting.photoOffsetX !== undefined ? customSetting.photoOffsetX : 0,
                photoOffsetY: customSetting.photoOffsetY !== undefined ? customSetting.photoOffsetY : 3,
                photoRotate: customSetting.photoRotate !== undefined ? customSetting.photoRotate : 0,
                photoFlipX: customSetting.photoFlipX !== undefined ? customSetting.photoFlipX : false,
                schedule: doc.schedule || {}
            };
        });
    }, [executiveDoctors, dailyDoctors]);

    // Update photo settings for a doctor in Master Catalog & sync across all days immediately
    const updateMasterDoctorPhoto = (docKeyOrId, photoFields) => {
        const targetDoc = allExecutiveDoctorsList.find(d => d.id === docKeyOrId || d.slug === docKeyOrId || d.name === docKeyOrId)
            || dailyDoctors.find(d => d.id === docKeyOrId);

        const slug = targetDoc ? (targetDoc.slug || createDoctorSlug(targetDoc.name)) : docKeyOrId;
        if (slug) {
            saveDoctorPhotoSetting(slug, photoFields);
        }

        // Sync into dailyDoctors state immediately
        setDailyDoctors(prev => prev.map(doc => {
            const dSlug = createDoctorSlug(doc.name);
            if (doc.id === docKeyOrId || dSlug === slug || doc.name === targetDoc?.name) {
                return { ...doc, ...photoFields };
            }
            return doc;
        }));
    };

    // Apply standard framing preset (Zoom 75%, Y 3%) to all doctors & persist to localStorage
    const applyFaceCenteringToAll = () => {
        setHasManualEdits(true);
        setDailyDoctors(prev => {
            const updated = prev.map(doc => ({
                ...doc,
                photoScale: 0.75,
                photoOffsetX: 0,
                photoOffsetY: 3,
                photoRotate: 0,
                photoFlipX: false
            }));
            saveBulkDoctorPhotoSettings(updated);
            return updated;
        });

        // Also bulk save for all doctors in the master catalog
        if (executiveDoctors && executiveDoctors.length > 0) {
            const allUpdated = executiveDoctors.map(doc => ({
                ...doc,
                photoScale: 0.75,
                photoOffsetX: 0,
                photoOffsetY: 3,
                photoRotate: 0,
                photoFlipX: false
            }));
            saveBulkDoctorPhotoSettings(allUpdated);
        }
    };

    // Change Selected Day (automatically loads stored photo settings for all doctors practicing on this day)
    const handleSelectDay = (day) => {
        setSelectedDay(day);
        const updated = generateDoctorsForDay(day, executiveDoctors);
        setDailyDoctors(updated);
        setHasManualEdits(false);
        // Replay animation on day change
        setAnimationKey(prev => prev + 1);
    };

    // Toggle single doctor enabled state
    const toggleDoctor = (id) => {
        setHasManualEdits(true);
        setDailyDoctors(prev => prev.map(doc => {
            if (doc.id === id) {
                return { ...doc, enabled: !doc.enabled };
            }
            return doc;
        }));
    };

    // Update single doctor details
    const updateDoctor = (id, field, value) => {
        setHasManualEdits(true);
        setDailyDoctors(prev => prev.map(doc => {
            if (doc.id === id) {
                const updated = { ...doc, [field]: value };
                if (['photoScale', 'photoOffsetX', 'photoOffsetY', 'photoRotate', 'photoFlipX', 'avatar'].includes(field)) {
                    const slug = createDoctorSlug(updated.name);
                    saveDoctorPhotoSetting(slug, { [field]: value });
                }
                return updated;
            }
            return doc;
        }));
    };

    // Batch update doctor fields & permanently save photo adjustments to localStorage
    const updateDoctorBatch = (id, fields) => {
        setHasManualEdits(true);
        setDailyDoctors(prev => prev.map(doc => {
            if (doc.id === id) {
                const merged = { ...doc, ...fields };
                const slug = createDoctorSlug(merged.name);
                saveDoctorPhotoSetting(slug, {
                    photoScale: merged.photoScale,
                    photoOffsetX: merged.photoOffsetX,
                    photoOffsetY: merged.photoOffsetY,
                    photoRotate: merged.photoRotate,
                    photoFlipX: merged.photoFlipX,
                    avatar: merged.avatar
                });
                return merged;
            }
            return doc;
        }));
    };

    // Move doctor item up or down in list
    const moveDoctor = (index, direction) => {
        setHasManualEdits(true);
        setDailyDoctors(prev => {
            const newList = [...prev];
            const targetIdx = index + direction;
            if (targetIdx < 0 || targetIdx >= newList.length) return prev;
            const temp = newList[index];
            newList[index] = newList[targetIdx];
            newList[targetIdx] = temp;
            return newList;
        });
    };

    // Add a custom new doctor
    const addCustomDoctor = (newDoc) => {
        setHasManualEdits(true);
        const item = {
            id: `custom-${Date.now()}`,
            name: newDoc.name || 'dr. Nama Dokter, Sp.X',
            specialty: newDoc.specialty || 'Dokter Spesialis',
            time: newDoc.time || '14:00–17:00',
            avatar: newDoc.avatar || null,
            enabled: true,
            isExecutive: true,
            photoScale: 0.75,
            photoOffsetX: 0,
            photoOffsetY: 3,
            photoRotate: 0,
            photoFlipX: false
        };
        const slug = createDoctorSlug(item.name);
        saveDoctorPhotoSetting(slug, {
            photoScale: item.photoScale,
            photoOffsetX: item.photoOffsetX,
            photoOffsetY: item.photoOffsetY,
            photoRotate: item.photoRotate,
            photoFlipX: item.photoFlipX,
            avatar: item.avatar
        });
        setDailyDoctors(prev => [item, ...prev]);
    };

    // Remove doctor from list
    const removeDoctor = (id) => {
        setHasManualEdits(true);
        setDailyDoctors(prev => prev.filter(doc => doc.id !== id));
    };

    // Reset list back to API defaults for current day
    const resetToApiSchedule = () => {
        const fresh = generateDoctorsForDay(selectedDay, executiveDoctors);
        setDailyDoctors(fresh);
        setHasManualEdits(false);
    };

    // Clear all saved photo memories in localStorage
    const clearSavedPhotoSettings = () => {
        try {
            localStorage.removeItem(PHOTO_SETTINGS_STORAGE_KEY);
            const fresh = generateDoctorsForDay(selectedDay, executiveDoctors);
            setDailyDoctors(fresh);
            alert('Pengaturan foto tersimpan berhasil direset ke standar pabrik.');
        } catch (e) {
            console.warn(e);
        }
    };

    // Update config property — always persists to localStorage
    const updateConfig = (key, value) => {
        setConfig(prev => {
            const next = { ...prev, [key]: value };
            try {
                localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
            } catch (e) {
                console.warn('[ExecutiveDailyStory] Failed to save config to localStorage', e);
            }
            return next;
        });
    };

    // Reset all config to default and clear localStorage
    const resetConfig = () => {
        try {
            localStorage.removeItem(CONFIG_STORAGE_KEY);
        } catch (e) {
            console.warn('[ExecutiveDailyStory] Failed to clear config from localStorage', e);
        }
        setConfig(DEFAULT_CONFIG);
        setAnimationKey(prev => prev + 1);
    };

    // Trigger replay of animations
    const replayAnimation = () => {
        setAnimationKey(prev => prev + 1);
    };

    // Active (enabled) doctors
    const activeDoctors = useMemo(() => {
        return dailyDoctors.filter(d => d.enabled);
    }, [dailyDoctors]);

    return (
        <ExecutiveDailyStoryContext.Provider
            value={{
                selectedDay,
                setSelectedDay: handleSelectDay,
                daysList: DAYS_LIST,
                dailyDoctors,
                activeDoctors,
                allExecutiveDoctorsList,
                updateMasterDoctorPhoto,
                toggleDoctor,
                updateDoctor,
                updateDoctorBatch,
                moveDoctor,
                addCustomDoctor,
                removeDoctor,
                resetToApiSchedule,
                applyFaceCenteringToAll,
                clearSavedPhotoSettings,
                hasManualEdits,
                config,
                updateConfig,
                resetConfig,
                animationKey,
                replayAnimation,
                loading,
                error,
                refetch,
                allDoctors,
                executiveDoctors
            }}
        >
            {children}
        </ExecutiveDailyStoryContext.Provider>
    );
};

export const useExecutiveDailyStory = () => {
    const context = useContext(ExecutiveDailyStoryContext);
    if (!context) {
        throw new Error('useExecutiveDailyStory must be used within an ExecutiveDailyStoryProvider');
    }
    return context;
};
