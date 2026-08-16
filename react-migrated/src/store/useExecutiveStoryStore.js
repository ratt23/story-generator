import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_CONFIG = {
    theme: 'white-gold', // 'white-gold' | 'royal-navy-gold' | 'onyx-gold' | 'emerald-luxury' | 'siloam-blue'
    format: 'story', // 'story' (1080x1920) | 'square' (1080x1080)
    headerLine1: 'Jadwal Praktik',
    headerLine2: 'Dokter',
    headerTag: 'EXECUTIVE CLINIC • RSU SILOAM AMBON',
    customDoctorName: '',
    customSpecialty: '',
    customSchedule: {},
    showExecutiveBadge: true,
    showLogo: true,
    showMySiloamCTA: true,
    showLeaveBadge: true,
    customNote: 'Pendaftaran & reservasi jadwal dokter dapat dilakukan melalui aplikasi MySiloam.',
    footerNote: 'Informasi jadwal dokter sewaktu-waktu dapat berubah.',
    emergencyNote: 'Emergency 24 Jam: 1-500-911',
    // Position & Spacing offsets
    tagOffsetY: 0,
    headerOffsetY: 0,
    doctorCardOffsetY: 0,
    scheduleOffsetY: 0,
    scheduleGap: 40,
    // Doctor Card Customization
    doctorCardScale: 1.0,
    doctorNameFontSize: 0, // 0 = auto
    doctorSpecialtyFontSize: 0, // 0 = auto (17px)
    doctorNameColor: '',
    doctorSpecialtyColor: '',
    // Photo Controls
    photoScale: 1.0,
    photoOffsetY: 0,
    photoOffsetX: 0,
    photoFlipX: false,
    // Custom Logo in Top-Left
    customLogoUrl: '',
    logoScale: 1.0,
    logoOffsetX: 0,
    logoOffsetY: 0,
    // Typography Colors
    customTitleColor: '',
    customScheduleTextColor: '',
};

export const useExecutiveStoryStore = create(
    persist(
        (set, get) => ({
            selectedDoctor: null,
            config: DEFAULT_CONFIG,

            // Select a doctor from pool and initialize config
            selectDoctor: (doc) => {
                set((state) => ({
                    selectedDoctor: doc,
                    config: {
                        ...state.config,
                        customDoctorName: doc?.name || '',
                        customSpecialty: doc?.specialty || '',
                        customSchedule: { ...(doc?.schedule || {}) },
                        photoScale: 1.0,
                        photoOffsetY: 0,
                        photoOffsetX: 0,
                        photoFlipX: false,
                        tagOffsetY: 0,
                        headerOffsetY: 0,
                        doctorCardOffsetY: 0,
                        scheduleOffsetY: 0,
                        scheduleGap: 40,
                        doctorCardScale: 1.0,
                        doctorNameFontSize: 0,
                        doctorSpecialtyFontSize: 0,
                        doctorNameColor: '',
                        doctorSpecialtyColor: '',
                    }
                }));
            },

            // Update single or multiple config keys
            updateConfig: (key, value) => {
                set((state) => ({
                    config: {
                        ...state.config,
                        [key]: value
                    }
                }));
            },

            // Update a specific day's practice hours
            updateSchedule: (day, value) => {
                set((state) => ({
                    config: {
                        ...state.config,
                        customSchedule: {
                            ...state.config.customSchedule,
                            [day]: value
                        }
                    }
                }));
            },

            // Reset text and schedule back to original selected doctor data
            resetToDoctorDefault: () => {
                const { selectedDoctor } = get();
                if (!selectedDoctor) return;
                set((state) => ({
                    config: {
                        ...state.config,
                        customDoctorName: selectedDoctor.name || '',
                        customSpecialty: selectedDoctor.specialty || '',
                        customSchedule: { ...(selectedDoctor.schedule || {}) },
                        photoScale: 1.0,
                        photoOffsetY: 0,
                        photoOffsetX: 0,
                        photoFlipX: false,
                        tagOffsetY: 0,
                        headerOffsetY: 0,
                        doctorCardOffsetY: 0,
                        scheduleOffsetY: 0,
                        scheduleGap: 40,
                        doctorCardScale: 1.0,
                        doctorNameFontSize: 0,
                        doctorSpecialtyFontSize: 0,
                        doctorNameColor: '',
                        doctorSpecialtyColor: '',
                        customTitleColor: '',
                        customScheduleTextColor: '',
                    }
                }));
            },

            // Reset layout positions back to standard coordinates
            resetPositions: () => {
                set((state) => ({
                    config: {
                        ...state.config,
                        tagOffsetY: 0,
                        headerOffsetY: 0,
                        doctorCardOffsetY: 0,
                        scheduleOffsetY: 0,
                        scheduleGap: 40,
                        doctorCardScale: 1.0,
                        photoScale: 1.0,
                        photoOffsetY: 0,
                        photoOffsetX: 0,
                        photoFlipX: false,
                    }
                }));
            },

            // Save Logo settings explicitly to persistent storage
            saveLogoSettings: () => {
                try {
                    const { config } = get();
                    const logoData = {
                        customLogoUrl: config.customLogoUrl || '',
                        logoScale: config.logoScale !== undefined ? config.logoScale : 1.0,
                        logoOffsetX: config.logoOffsetX || 0,
                        logoOffsetY: config.logoOffsetY || 0,
                    };
                    localStorage.setItem('executive_story_logo_settings', JSON.stringify(logoData));
                    return true;
                } catch (e) {
                    console.error('Failed to save logo settings:', e);
                    return false;
                }
            },

            // Reset custom logo back to default Siloam logo
            resetLogoSettings: () => {
                try {
                    localStorage.removeItem('executive_story_logo_settings');
                } catch (e) {}
                set((state) => ({
                    config: {
                        ...state.config,
                        customLogoUrl: '',
                        logoScale: 1.0,
                        logoOffsetX: 0,
                        logoOffsetY: 0,
                    }
                }));
            },

            // Reset doctor card styling
            resetDoctorCard: () => {
                set((state) => ({
                    config: {
                        ...state.config,
                        doctorCardScale: 1.0,
                        doctorNameFontSize: 0,
                        doctorSpecialtyFontSize: 0,
                        doctorNameColor: '',
                        doctorSpecialtyColor: '',
                    }
                }));
            },

            // Reset entire config to pristine state
            resetAll: () => {
                set({
                    selectedDoctor: null,
                    config: DEFAULT_CONFIG
                });
            }
        }),
        {
            name: 'executive_story_store',
            storage: createJSONStorage(() => localStorage),
            // Only persist logo and theme preferences across reloads by default
            partialize: (state) => ({
                config: {
                    theme: state.config.theme,
                    customLogoUrl: state.config.customLogoUrl,
                    logoScale: state.config.logoScale,
                    logoOffsetX: state.config.logoOffsetX,
                    logoOffsetY: state.config.logoOffsetY,
                }
            }),
            merge: (persistedState, currentState) => ({
                ...currentState,
                ...persistedState,
                config: {
                    ...currentState.config,
                    ...(persistedState?.config || {})
                }
            })
        }
    )
);
