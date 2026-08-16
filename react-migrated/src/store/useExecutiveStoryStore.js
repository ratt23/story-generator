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
    // Position & Spacing offsets (Default: Screenshot 1)
    tagOffsetY: 50,
    headerOffsetY: 76,
    doctorCardOffsetY: 8,
    scheduleOffsetY: 38,
    scheduleGap: 45,
    // Photo Controls (Default: Screenshot 2)
    photoScale: 1.05,
    photoOffsetY: 0,
    photoOffsetX: 0,
    photoFlipX: false,
    // Doctor Card Customization (Default: Screenshot 3)
    doctorCardScale: 1.16,
    doctorNameFontSize: 26,
    doctorSpecialtyFontSize: 23,
    doctorNameColor: '#001238',
    doctorSpecialtyColor: '#001f5c',
    // Custom Logo in Top-Left (Default: Screenshot 4)
    customLogoUrl: '',
    logoScale: 1.35,
    logoOffsetX: -8,
    logoOffsetY: 24,
    // Typography Colors
    customTitleColor: '',
    customScheduleTextColor: '',
};

export const useExecutiveStoryStore = create(
    persist(
        (set, get) => ({
            selectedDoctor: null,
            config: DEFAULT_CONFIG,

            // Select a doctor from pool and initialize config with user default settings
            selectDoctor: (doc) => {
                set((state) => ({
                    selectedDoctor: doc,
                    config: {
                        ...state.config,
                        customDoctorName: doc?.name || '',
                        customSpecialty: doc?.specialty || '',
                        customSchedule: { ...(doc?.schedule || {}) },
                        photoScale: 1.05,
                        photoOffsetY: 0,
                        photoOffsetX: 0,
                        photoFlipX: false,
                        tagOffsetY: 50,
                        headerOffsetY: 76,
                        doctorCardOffsetY: 8,
                        scheduleOffsetY: 38,
                        scheduleGap: 45,
                        doctorCardScale: 1.16,
                        doctorNameFontSize: 26,
                        doctorSpecialtyFontSize: 23,
                        doctorNameColor: '#001238',
                        doctorSpecialtyColor: '#001f5c',
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

            // Reset text and schedule back to user default settings
            resetToDoctorDefault: () => {
                const { selectedDoctor } = get();
                if (!selectedDoctor) return;
                set((state) => ({
                    config: {
                        ...state.config,
                        customDoctorName: selectedDoctor.name || '',
                        customSpecialty: selectedDoctor.specialty || '',
                        customSchedule: { ...(selectedDoctor.schedule || {}) },
                        photoScale: 1.05,
                        photoOffsetY: 0,
                        photoOffsetX: 0,
                        photoFlipX: false,
                        tagOffsetY: 50,
                        headerOffsetY: 76,
                        doctorCardOffsetY: 8,
                        scheduleOffsetY: 38,
                        scheduleGap: 45,
                        doctorCardScale: 1.16,
                        doctorNameFontSize: 26,
                        doctorSpecialtyFontSize: 23,
                        doctorNameColor: '#001238',
                        doctorSpecialtyColor: '#001f5c',
                        customTitleColor: '',
                        customScheduleTextColor: '',
                    }
                }));
            },

            // Reset layout positions back to user default coordinates
            resetPositions: () => {
                set((state) => ({
                    config: {
                        ...state.config,
                        tagOffsetY: 50,
                        headerOffsetY: 76,
                        doctorCardOffsetY: 8,
                        scheduleOffsetY: 38,
                        scheduleGap: 45,
                        doctorCardScale: 1.16,
                        photoScale: 1.05,
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
                        logoScale: config.logoScale !== undefined ? config.logoScale : 1.35,
                        logoOffsetX: config.logoOffsetX !== undefined ? config.logoOffsetX : -8,
                        logoOffsetY: config.logoOffsetY !== undefined ? config.logoOffsetY : 24,
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
                        logoScale: 1.35,
                        logoOffsetX: -8,
                        logoOffsetY: 24,
                    }
                }));
            },

            // Reset doctor card styling
            resetDoctorCard: () => {
                set((state) => ({
                    config: {
                        ...state.config,
                        doctorCardScale: 1.16,
                        doctorNameFontSize: 26,
                        doctorSpecialtyFontSize: 23,
                        doctorNameColor: '#001238',
                        doctorSpecialtyColor: '#001f5c',
                    }
                }));
            },

            // Reset entire config to pristine default state
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
