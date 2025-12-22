import { createContext, useContext, useState } from 'react';

const StoryContext = createContext();

export const useStory = () => useContext(StoryContext);

export const StoryProvider = ({ children }) => {
    // Selection State
    const [selectedDoctorIds, setSelectedDoctorIds] = useState([]);

    // Config State (Default values from index.html)
    const [config, setConfig] = useState({
        theme: 'gradient-blue',
        format: 'story', // story | square
        customMessage: '',
        headerTop: 'PEMBERITAHUAN',
        headerMain: 'DOKTER CUTI',
        // Font Sizes (scales)
        headerFontSize: 1, // Range 0.5 - 2
        dateFontSize: 1, // Range 0.8 - 1.5
        doctorFontSize: 1, // Range 0.8 - 1.5 (mapped to fontSizeRange)
        // Specific pixel sizes (new feature)
        headerTopSize: 48,
        headerMainSize: 128,
        headerSpacing: 8,
        headerVerticalPos: 0,
        // Layout
        textAlign: 'center',
        verticalPos: 0,
        spacing: 24,
        showFooter: true,
        logoUrl: '', // Default relies on asset/logo/logo.png in component
        // Background Image? Handled by theme usually
    });

    const toggleDoctor = (id) => {
        setSelectedDoctorIds(prev =>
            prev.includes(id)
                ? prev.filter(dId => dId !== id)
                : [...prev, id]
        );
    };

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const resetConfig = () => {
        // Reset to defaults...
    };

    return (
        <StoryContext.Provider value={{
            selectedDoctorIds,
            toggleDoctor,
            config,
            updateConfig
        }}>
            {children}
        </StoryContext.Provider>
    );
};
