import { FileText } from 'lucide-react';

const CHANGELOG_DATA = [
    {
        version: 'v3.0.0',
        date: '2026-08-17',
        isLatest: true,
        entries: [
            { type: 'fix', text: 'Executive Brochure: Preview no longer zooms in unexpectedly when opened' },
            { type: 'fix', text: 'Regular Brochure: Preview no longer zooms in unexpectedly when opened' },
            { type: 'fix', text: 'Regular & Executive Brochure: Logo, photos, and cover images now display correctly when printing' },
            { type: 'fix', text: 'Slider settings (font size, spacing, position) are now correctly applied when printing or saving as PDF' },
            { type: 'add', text: 'Changelog menu added to the left sidebar with a latest version badge' },
            { type: 'add', text: 'System technical documentation fully updated' },
        ]
    },
    {
        version: 'v2.9.0',
        date: '2026-08-16',
        entries: [
            { type: 'fix', text: 'Doctor schedules no longer get cut off at the bottom of brochure columns' },
            { type: 'fix', text: 'Excessive empty space between the column title and schedule list has been removed' },
            { type: 'add', text: 'System now accurately calculates the height of each doctor card for cleaner column distribution' },
            { type: 'add', text: 'If a doctor\'s schedule doesn\'t fit in one column, it automatically continues in the next column labeled "(Continued)"' },
        ]
    },
    {
        version: 'v2.8.0',
        date: '2026-08-15',
        entries: [
            { type: 'add', text: 'Regular Brochure: Settings sidebar now has 5 tabs — Layout, Images, Text, Order, and Upload' },
            { type: 'add', text: 'Layout tab: Adjust overall scale, brochure position, element spacing, and font sizes' },
            { type: 'add', text: 'Images tab: Adjust position, size, and opacity for each brochure image (cover, background, phone mockup)' },
            { type: 'add', text: 'Text tab: Edit all brochure text — title, subtitle, address, phone number, year, etc.' },
            { type: 'add', text: 'Order tab: Move specialties and doctors up/down, or hide specific doctors' },
            { type: 'add', text: 'Upload tab: Replace logo, cover photo, background, and phone mockup with your own files' },
            { type: 'add', text: 'Save Changes button: All settings are saved automatically and restored when the page is reopened' },
            { type: 'add', text: 'Export and import brochure configuration as a JSON file' },
            { type: 'fix', text: 'Brochure preview no longer appears squashed or distorted' },
            { type: 'fix', text: 'Phone mockup image in the middle panel no longer gets clipped' },
            { type: 'fix', text: 'Gap between the main title and subtitle can now be adjusted with a dedicated slider' },
        ]
    },
    {
        version: 'v2.7.0',
        date: '2026-08-14',
        entries: [
            { type: 'add', text: 'Executive Brochure: Layout and design updated to match the latest template' },
            { type: 'add', text: 'Executive Brochure: Preview updates instantly when settings are changed, no manual refresh needed' },
            { type: 'fix', text: 'Executive Brochure: Changes made in the edit panel now correctly appear in the preview' },
        ]
    },
    {
        version: 'v2.6.0',
        date: '2026-08-13',
        entries: [
            { type: 'add', text: 'All changes (text, layout, images, doctor order) are automatically saved and restored when the page is reopened' },
            { type: 'fix', text: 'Clearing a text field now correctly shows as empty in the brochure — it no longer reverts to the default text unexpectedly' },
        ]
    },
    {
        version: 'v2.5.0',
        date: '2026-08-12',
        entries: [
            { type: 'add', text: 'All text in the Regular Brochure can now be edited directly from the panel, with real-time preview updates' },
        ]
    },
    {
        version: 'v2.4.0',
        date: '2026-08-11',
        entries: [
            { type: 'change', text: 'Regular Brochure and Executive Brochure are now fully independent — changes to one brochure no longer affect the other' },
            { type: 'fix', text: 'Fixed a bug where editing the Executive Brochure accidentally broke the Regular Brochure layout' },
        ]
    },
    {
        version: 'v2.3.0',
        date: '2026-08-10',
        entries: [
            { type: 'add', text: 'New feature: Executive Bifold Brochure Generator (2-fold) with a White-Gold premium theme' },
            { type: 'add', text: 'Circular doctor photos from the hospital database are automatically displayed in the Executive Brochure' },
            { type: 'add', text: 'Executive Brochure consists of 2 A4 sheets: Outer Pages (front & back cover) and Inner Pages (doctor list)' },
        ]
    },
    {
        version: 'v2.2.0',
        date: '2026-08-09',
        entries: [
            { type: 'change', text: 'RSU Siloam logo in the regular brochure is now fetched automatically from the database, no longer a static file that requires manual updates' },
            { type: 'change', text: 'Brochure cover design updated to White-Gold theme to match the Executive Clinic branding' },
        ]
    },
    {
        version: 'v2.1.0',
        date: '2026-08-08',
        entries: [
            { type: 'add', text: 'New feature: Trifold Brochure Generator (3-fold) A4 for all specialist doctor schedules' },
            { type: 'add', text: 'Doctor schedules are automatically distributed into 3 neat columns on the inner pages' },
            { type: 'add', text: 'Outer pages include a doctor list, hospital address, and cover photo' },
            { type: 'add', text: 'Preview button to see the result, and Print Brochure button to print or save as PDF' },
        ]
    },
    {
        version: 'v2.0.0',
        date: '2026-08-07',
        entries: [
            { type: 'add', text: 'New feature: Executive Doctor Poster Generator — create high-resolution Instagram Story and Square posters' },
            { type: 'add', text: '5 poster themes: White-Gold, Royal Navy Gold, Onyx Gold, Emerald Luxury, and Siloam Blue' },
            { type: 'add', text: 'All settings saved automatically — no need to reconfigure every time the app is opened' },
            { type: 'add', text: 'Download posters directly as high-resolution PNG images (2160px)' },
            { type: 'add', text: 'Upload a custom hospital logo directly from your device' },
        ]
    },
    {
        version: 'v1.5.0',
        date: '2026-07-20',
        entries: [
            { type: 'add', text: 'First doctor schedule poster generator — Instagram Story (vertical) format' },
            { type: 'add', text: 'Control panel and poster preview area' },
            { type: 'add', text: 'Download poster as a PNG image' },
        ]
    },
    {
        version: 'v1.0.0',
        date: '2026-07-01',
        entries: [
            { type: 'add', text: 'First release of the Graphicat Story Generator application' },
            { type: 'add', text: 'Module navigation with left sidebar menu' },
            { type: 'add', text: 'Connected to the RSU Siloam Ambon doctor schedule database' },
            { type: 'add', text: 'Photo and logo upload feature directly from your device' },
        ]
    }
];

const TYPE_CONFIG = {
    add: {
        icon: '✓',
        color: '#16a34a',
        bg: '#f0fdf4',
        border: '#bbf7d0',
    },
    fix: {
        icon: '🔧',
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
    },
    change: {
        icon: '↻',
        color: '#2563eb',
        bg: '#eff6ff',
        border: '#bfdbfe',
    },
};

export const ChangelogPage = () => {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#f0f2f5',
            fontFamily: "'Inter', 'Plus Jakarta Sans', 'Poppins', sans-serif",
            padding: '0 0 80px 0',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <div style={{
                padding: '28px 40px 24px',
                borderBottom: '1px solid #dfe3e7',
                background: '#ffffff',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <FileText size={20} style={{ color: '#1e3a8a' }} />
                    <h1 style={{
                        fontSize: '20px',
                        fontWeight: '800',
                        color: '#0f172a',
                        margin: 0,
                        letterSpacing: '-0.3px'
                    }}>
                        Changelog
                    </h1>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                    Version history and system updates — Graphicat Story Generator RSU Siloam Ambon
                </p>
            </div>

            {/* Timeline */}
            <div style={{ padding: '40px 40px 0', position: 'relative', maxWidth: '900px' }}>
                {/* Vertical line */}
                <div style={{
                    position: 'absolute',
                    left: '52px',
                    top: '40px',
                    bottom: 0,
                    width: '2px',
                    background: 'linear-gradient(to bottom, #3b82f6 0%, #e2e8f0 100%)',
                    borderRadius: '2px'
                }} />

                {CHANGELOG_DATA.map((item, idx) => (
                    <div key={item.version} style={{ display: 'flex', gap: '28px', marginBottom: '28px', position: 'relative' }}>
                        {/* Timeline dot */}
                        <div style={{
                            position: 'absolute',
                            left: '-19px',
                            top: '18px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: idx === 0 ? '#1e3a8a' : '#ffffff',
                            border: idx === 0 ? '3px solid #3b82f6' : '2px solid #cbd5e1',
                            boxShadow: idx === 0 ? '0 0 0 4px rgba(59,130,246,0.15)' : 'none',
                            zIndex: 1
                        }} />

                        {/* Card */}
                        <div style={{
                            flex: 1,
                            background: '#ffffff',
                            border: idx === 0 ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '20px 24px',
                            boxShadow: idx === 0
                                ? '0 2px 12px rgba(59,130,246,0.08), 0 1px 3px rgba(0,0,0,0.05)'
                                : '0 1px 3px rgba(0,0,0,0.04)',
                        }}>
                            {/* Card header */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        fontSize: '16px',
                                        fontWeight: '800',
                                        color: idx === 0 ? '#1e3a8a' : '#374151',
                                        letterSpacing: '-0.3px'
                                    }}>
                                        {item.version}
                                    </span>
                                    {item.isLatest && (
                                        <span style={{
                                            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                                            color: '#ffffff',
                                            fontSize: '9px',
                                            fontWeight: '800',
                                            letterSpacing: '1px',
                                            padding: '2px 7px',
                                            borderRadius: '10px',
                                            textTransform: 'uppercase',
                                            boxShadow: '0 2px 6px rgba(30,58,138,0.25)'
                                        }}>
                                            LATEST
                                        </span>
                                    )}
                                </div>
                                <span style={{
                                    fontSize: '11.5px',
                                    color: '#94a3b8',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    padding: '2px 8px',
                                    borderRadius: '6px'
                                }}>
                                    {item.date}
                                </span>
                            </div>

                            {/* Entries */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {item.entries.map((entry, eIdx) => {
                                    const cfg = TYPE_CONFIG[entry.type];
                                    return (
                                        <div key={eIdx} style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '9px',
                                            padding: '7px 11px',
                                            borderRadius: '6px',
                                            background: cfg.bg,
                                            border: `1px solid ${cfg.border}`,
                                        }}>
                                            <span style={{
                                                color: cfg.color,
                                                fontSize: entry.type === 'add' ? '13px' : '10px',
                                                fontWeight: '800',
                                                lineHeight: '1.5',
                                                flexShrink: 0,
                                                marginTop: '1px',
                                                minWidth: '14px',
                                                textAlign: 'center'
                                            }}>
                                                {cfg.icon}
                                            </span>
                                            <span style={{
                                                fontSize: '12px',
                                                color: '#374151',
                                                lineHeight: '1.6',
                                            }}>
                                                {entry.text}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '0 40px', maxWidth: '900px', marginTop: '8px' }}>
                <p style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    textAlign: 'center',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '20px'
                }}>
                    Graphicat Story Generator — RSU Siloam Ambon &bull; {CHANGELOG_DATA.length} versi tercatat
                </p>
            </div>
        </div>
    );
};
