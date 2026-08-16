import { useState, useEffect, useMemo } from 'react';
import { useExecutiveStory } from '../../context/ExecutiveStoryContext';
import { getDoctorInitials, createDoctorSlug, DAYS_LIST } from '../../utils/imageHelper';
import { Calendar, User, Info, Stethoscope } from 'lucide-react';

// Dynamic Font Size Helper for Doctor Name
function getDoctorNameFontSize(name) {
    if (!name) return '28px';
    const len = name.length;
    if (len > 55) return '21px';
    if (len > 42) return '23px';
    if (len > 30) return '26px';
    return '28px';
}

// Theme Definitions Map
const THEME_STYLES = {
    'white-gold': {
        bg: 'linear-gradient(180deg, #ffffff 0%, #fbfcfd 35%, #f2f5f9 100%)',
        textColor: '#001f5c',
        titleDefaultColor: '#001f5c',
        scheduleDefaultColor: '#001f5c',
        subTextColor: '#334155',
        dotColor: '#d4af37',
        crossColor: '#d4af37',
        glowColor1: 'radial-gradient(circle, rgba(212, 175, 55, 0.16) 0%, rgba(245, 158, 11, 0.04) 50%, transparent 70%)',
        glowColor2: 'radial-gradient(circle, rgba(0, 31, 92, 0.06) 0%, transparent 70%)',
        cardBg: 'rgba(255, 255, 255, 0.95)',
        cardBorder: '1.5px solid rgba(212, 175, 55, 0.38)',
        cardShadow: '0 12px 28px rgba(0, 31, 92, 0.08)',
        waveColor2: '#001f5c', // Navy curve
        bgFadeColor: '#f2f5f9',
        logoTextColor: '#001f5c'
    },
    'royal-navy-gold': {
        bg: 'linear-gradient(165deg, #010a1c 0%, #001f5c 42%, #001238 100%)',
        textColor: '#ffffff',
        titleDefaultColor: '#ffffff',
        scheduleDefaultColor: '#ffffff',
        subTextColor: '#e2e8f0',
        dotColor: '#38bdf8',
        crossColor: '#38bdf8',
        glowColor1: 'radial-gradient(circle, rgba(2, 132, 199, 0.28) 0%, rgba(0, 31, 92, 0.05) 55%, transparent 70%)',
        glowColor2: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
        cardBg: 'rgba(0, 23, 68, 0.82)',
        cardBorder: '1px solid rgba(255, 255, 255, 0.16)',
        cardShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
        waveColor2: '#ffffff', // White curve
        bgFadeColor: '#001238',
        logoTextColor: '#ffffff'
    },
    'onyx-gold': {
        bg: 'linear-gradient(165deg, #030712 0%, #111827 45%, #030712 100%)',
        textColor: '#ffffff',
        titleDefaultColor: '#ffffff',
        scheduleDefaultColor: '#ffffff',
        subTextColor: '#e2e8f0',
        dotColor: '#f59e0b',
        crossColor: '#f59e0b',
        glowColor1: 'radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, transparent 70%)',
        glowColor2: 'radial-gradient(circle, rgba(31, 41, 55, 0.3) 0%, transparent 70%)',
        cardBg: 'rgba(17, 24, 39, 0.88)',
        cardBorder: '1.5px solid rgba(245, 158, 11, 0.35)',
        cardShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
        waveColor2: '#1f2937', // Dark Gray curve
        bgFadeColor: '#030712',
        logoTextColor: '#ffffff'
    },
    'emerald-luxury': {
        bg: 'linear-gradient(165deg, #022c22 0%, #064e3b 45%, #022c22 100%)',
        textColor: '#ffffff',
        titleDefaultColor: '#ffffff',
        scheduleDefaultColor: '#ffffff',
        subTextColor: '#d1fae5',
        dotColor: '#34d399',
        crossColor: '#34d399',
        glowColor1: 'radial-gradient(circle, rgba(52, 211, 153, 0.22) 0%, transparent 70%)',
        glowColor2: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
        cardBg: 'rgba(6, 78, 59, 0.82)',
        cardBorder: '1.5px solid rgba(52, 211, 153, 0.35)',
        cardShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
        waveColor2: '#064e3b', // Emerald curve
        bgFadeColor: '#022c22',
        logoTextColor: '#ffffff'
    },
    'siloam-blue': {
        bg: 'linear-gradient(165deg, #0c2340 0%, #003b73 45%, #001f3f 100%)',
        textColor: '#ffffff',
        titleDefaultColor: '#ffffff',
        scheduleDefaultColor: '#ffffff',
        subTextColor: '#e0f2fe',
        dotColor: '#38bdf8',
        crossColor: '#38bdf8',
        glowColor1: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)',
        glowColor2: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
        cardBg: 'rgba(0, 59, 115, 0.82)',
        cardBorder: '1.5px solid rgba(56, 189, 248, 0.35)',
        cardShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
        waveColor2: '#0284c7', // Sky Blue curve
        bgFadeColor: '#001f3f',
        logoTextColor: '#ffffff'
    }
};

/**
 * Reusable DoctorImage Component with Natural Proportions (Prevents html2canvas stretching/lonjong)
 */
const DoctorImage = ({
    imgSrc,
    doctorName,
    imgError,
    onError,
    isSquare,
    config,
    bgFadeColor = '#f2f5f9'
}) => {
    const flipTransform = config.photoFlipX ? 'scaleX(-1)' : 'scaleX(1)';
    const baseTransform = `scale(${config.photoScale || 1}) translate(${config.photoOffsetX || 0}px, ${config.photoOffsetY || 0}px) ${flipTransform}`;

    return (
        <div
            style={{
                position: 'absolute',
                right: '-30px',
                bottom: '145px',
                width: isSquare ? '520px' : '580px',
                height: isSquare ? '750px' : '1300px',
                zIndex: 10,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                transform: baseTransform,
                transformOrigin: 'bottom center'
            }}
        >
            {imgSrc && !imgError ? (
                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center'
                    }}
                >
                    {/* Doctor Portrait: uses width: auto / height: auto with maxHeight so html2canvas preserves exact aspect ratio without stretching */}
                    <img
                        src={imgSrc}
                        alt={doctorName}
                        crossOrigin="anonymous"
                        style={{
                            maxWidth: '100%',
                            maxHeight: isSquare ? '750px' : '1280px',
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                            margin: '0 auto',
                            filter: 'drop-shadow(0 18px 26px rgba(0, 31, 92, 0.18))'
                        }}
                        onError={onError}
                    />

                    {/* Soft Bottom Edge Blend Overlay */}
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: '80px',
                            background: `linear-gradient(to top, ${bgFadeColor} 0%, rgba(242, 245, 249, 0.4) 60%, transparent 100%)`,
                            pointerEvents: 'none'
                        }}
                    />
                </div>
            ) : (
                /* Minimal placeholder if doctor photo is missing */
                <div
                    style={{
                        width: '380px',
                        height: '560px',
                        borderRadius: '24px',
                        backgroundColor: 'rgba(0, 31, 92, 0.05)',
                        border: '1.5px solid rgba(212, 175, 55, 0.35)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#001f5c',
                        marginBottom: '40px'
                    }}
                >
                    <Stethoscope style={{ width: '70px', height: '70px', color: '#d4af37', strokeWidth: 1.5, marginBottom: '12px' }} />
                    <span style={{ fontSize: '32px', fontWeight: 900, color: '#b45309', letterSpacing: '2px' }}>
                        {getDoctorInitials(doctorName)}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginTop: '6px' }}>
                        Foto Dokter
                    </span>
                </div>
            )}
        </div>
    );
};

export const ExecutiveStoryCanvas = ({ canvasRef }) => {
    const { selectedDoctor, config } = useExecutiveStory();
    const [imgError, setImgError] = useState(false);
    const [imgSrc, setImgSrc] = useState('');

    const isSquare = config.format === 'square';
    const canvasHeight = isSquare ? 1080 : 1920;

    const doctorName = config.customDoctorName || selectedDoctor?.name || '';
    const specialtyTitle = config.customSpecialty || selectedDoctor?.specialty || '';
    const schedule = config.customSchedule || selectedDoctor?.schedule || {};

    // Get Active Theme Palette
    const currentThemeKey = config.theme || 'white-gold';
    const theme = THEME_STYLES[currentThemeKey] || THEME_STYLES['white-gold'];

    // Reset image error and resolve initial image source on doctor change
    useEffect(() => {
        setImgError(false);
        if (selectedDoctor?.image_url) {
            setImgSrc(selectedDoctor.image_url);
        } else if (doctorName) {
            const slug = createDoctorSlug(doctorName);
            setImgSrc(`/asset/webp/${slug}.webp`);
        } else {
            setImgSrc('');
        }
    }, [selectedDoctor?.id, selectedDoctor?.name, selectedDoctor?.image_url, doctorName]);

    const handleImageError = () => {
        if (imgSrc && !imgSrc.includes('/asset/webp/')) {
            const slug = createDoctorSlug(doctorName);
            setImgSrc(`/asset/webp/${slug}.webp`);
        } else {
            setImgError(true);
        }
    };

    // Filter active schedule days
    const activeDays = useMemo(() => {
        return DAYS_LIST.filter(day => {
            const t = schedule[day] || schedule[day.toLowerCase()];
            return Boolean(t && String(t).trim() !== '' && String(t).trim() !== '-');
        });
    }, [schedule]);

    if (!selectedDoctor) {
        return (
            <div
                ref={canvasRef}
                id="executive-story-preview"
                className="story-canvas"
                style={{
                    position: 'relative',
                    width: '1080px',
                    height: `${canvasHeight}px`,
                    overflow: 'hidden',
                    background: theme.bg,
                    color: theme.textColor,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '48px',
                    textAlign: 'center',
                    fontFamily: 'Poppins, "Plus Jakarta Sans", sans-serif'
                }}
            >
                <Stethoscope className="w-24 h-24 text-amber-500 mb-6 animate-pulse" />
                <h2 className="text-4xl font-extrabold mb-2" style={{ color: theme.textColor }}>Pilih Dokter Terlebih Dahulu</h2>
                <p className="text-xl max-w-md" style={{ color: theme.subTextColor }}>
                    Silakan pilih salah satu dokter dari panel sebelah kiri untuk melihat dan mengunduh kartu jadwal Instagram Story.
                </p>
            </div>
        );
    }

    const nameFontSize = getDoctorNameFontSize(doctorName);

    // Dynamic Position Coordinates (Harmonious vertical hierarchy)
    const logoLeft = 85 + (config.logoOffsetX || 0);
    const logoTop = 75 + (config.logoOffsetY || 0);
    const logoScale = config.logoScale !== undefined ? config.logoScale : 1.0;

    const tagTop = (isSquare ? 100 : 180) + (config.tagOffsetY || 0);
    const titleTop = (isSquare ? 175 : 265) + (config.headerOffsetY || 0);
    const doctorCardTop = (isSquare ? 400 : 565) + (config.doctorCardOffsetY || 0);
    const scheduleTop = (isSquare ? 580 : 820) + (config.scheduleOffsetY || 0);
    const scheduleGap = config.scheduleGap !== undefined ? config.scheduleGap : 45;

    // Dynamic Typography Colors (falls back to theme default)
    const titleTextColor = config.customTitleColor || theme.titleDefaultColor;
    const scheduleTextColor = config.customScheduleTextColor || theme.scheduleDefaultColor;

    return (
        <div
            ref={canvasRef}
            id="executive-story-preview"
            className="story-canvas select-none"
            style={{
                position: 'relative',
                width: '1080px',
                height: `${canvasHeight}px`,
                overflow: 'hidden',
                background: theme.bg,
                color: theme.textColor,
                fontFamily: 'Poppins, "Plus Jakarta Sans", sans-serif'
            }}
        >
            {/* ======================================================== */}
            {/* LAYER 1: BACKGROUND & AMBIENT SOFT LIGHTING              */}
            {/* ======================================================== */}
            <div
                style={{
                    position: 'absolute',
                    top: '18%',
                    right: '-40px',
                    width: '800px',
                    height: '800px',
                    borderRadius: '50%',
                    background: theme.glowColor1,
                    pointerEvents: 'none',
                    zIndex: 1
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: '22%',
                    left: '-50px',
                    width: '650px',
                    height: '650px',
                    borderRadius: '50%',
                    background: theme.glowColor2,
                    pointerEvents: 'none',
                    zIndex: 1
                }}
            />

            {/* ======================================================== */}
            {/* LAYER 2: DECORATIVE SHAPES (Dots & Medical Cross)        */}
            {/* ======================================================== */}
            {/* Top-Right 5x5 Dot Matrix Grid */}
            <div
                style={{
                    position: 'absolute',
                    top: '75px',
                    right: '80px',
                    pointerEvents: 'none',
                    opacity: 0.45,
                    zIndex: 2
                }}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                    {Array.from({ length: 25 }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: theme.dotColor
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Upper-Right Subtle Outlined Medical Cross */}
            <div
                style={{
                    position: 'absolute',
                    right: '30px',
                    top: '320px',
                    pointerEvents: 'none',
                    opacity: 0.22,
                    zIndex: 2
                }}
            >
                <svg width="220" height="220" viewBox="0 0 100 100" fill="none">
                    <path
                        d="M38 10 H62 V38 H90 V62 H62 V90 H38 V62 H10 V38 H38 Z"
                        stroke={theme.crossColor}
                        strokeWidth="3.5"
                        strokeLinejoin="round"
                        fill="none"
                    />
                </svg>
            </div>

            {/* ======================================================== */}
            {/* LAYER 5: DECORATIVE FOOTER CURVED WAVE (Gold & Secondary)*/}
            {/* ======================================================== */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '740px',
                    height: '240px',
                    pointerEvents: 'none',
                    zIndex: 15
                }}
            >
                <svg viewBox="0 0 740 240" fill="none" style={{ width: '100%', height: '100%', position: 'absolute', bottom: 0, right: 0 }}>
                    {/* Gold Curve */}
                    <path
                        d="M0 240 C280 200 480 85 740 40 L740 240 Z"
                        fill="url(#goldFooterGrad)"
                    />
                    {/* Secondary Curve */}
                    <path
                        d="M50 240 C320 210 520 125 740 100 L740 240 Z"
                        fill={theme.waveColor2}
                    />
                    <defs>
                        <linearGradient id="goldFooterGrad" x1="0" y1="0" x2="740" y2="240" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#fbbf24" />
                            <stop offset="1" stopColor="#d97706" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {/* ======================================================== */}
            {/* LAYER 10: DOCTOR PORTRAIT (HERO VISUAL ON RIGHT: 55%)    */}
            {/* ======================================================== */}
            <DoctorImage
                imgSrc={imgSrc}
                doctorName={doctorName}
                imgError={imgError}
                onError={handleImageError}
                isSquare={isSquare}
                config={config}
                bgFadeColor={theme.bgFadeColor}
            />

            {/* ======================================================== */}
            {/* LAYER 30: TOP-LEFT LOGO (CUSTOMIZABLE & ADJUSTABLE)      */}
            {/* ======================================================== */}
            {config.showLogo && (
                <div
                    style={{
                        position: 'absolute',
                        left: `${logoLeft}px`,
                        top: `${logoTop}px`,
                        zIndex: 35,
                        display: 'flex',
                        alignItems: 'center',
                        transform: `scale(${logoScale})`,
                        transformOrigin: 'top left'
                    }}
                >
                    {config.customLogoUrl ? (
                        <img
                            src={config.customLogoUrl}
                            alt="Logo"
                            crossOrigin="anonymous"
                            style={{
                                maxHeight: '58px',
                                maxWidth: '280px',
                                objectFit: 'contain'
                            }}
                        />
                    ) : (
                        /* Default Clean Siloam Typography */
                        <div style={{ fontSize: '38px', letterSpacing: '-0.8px', display: 'flex', alignItems: 'center', gap: '8px', color: theme.logoTextColor, lineHeight: 1 }}>
                            <span style={{ fontWeight: 300 }}>RSU</span>
                            <span style={{ fontWeight: 900 }}>Siloam</span>
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* LAYER 30: LEFT INFORMATION COLUMN                        */}
            {/* ======================================================== */}

            {/* 1. TOP LABEL (EYEBROW PILL) - y: dynamic with tagTop */}
            <div
                style={{
                    position: 'absolute',
                    left: '85px',
                    top: `${tagTop}px`,
                    zIndex: 30,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '11px 22px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)',
                    color: '#001238',
                    fontWeight: 900,
                    fontSize: '13px',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
                    border: '1px solid rgba(254, 240, 138, 0.5)'
                }}
            >
                <Calendar style={{ width: '17px', height: '17px', strokeWidth: 2.5 }} />
                <span>{config.headerTag || 'EXECUTIVE CLINIC • RSU SILOAM AMBON'}</span>
            </div>

            {/* 2. MAIN TITLE - y: dynamic with titleTop & titleTextColor */}
            <div
                style={{
                    position: 'absolute',
                    left: '85px',
                    top: `${titleTop}px`,
                    zIndex: 30,
                    maxWidth: '530px'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                        style={{
                            fontSize: '72px',
                            fontWeight: 500,
                            color: titleTextColor,
                            lineHeight: 1.15,
                            letterSpacing: '-1.5px'
                        }}
                    >
                        {config.headerLine1 || 'Jadwal Praktik'}
                    </div>
                    <div
                        style={{
                            fontSize: '104px',
                            fontWeight: 900,
                            color: titleTextColor,
                            lineHeight: 1.15,
                            letterSpacing: '-2.5px',
                            marginTop: '8px',
                            paddingBottom: '6px'
                        }}
                    >
                        {config.headerLine2 || 'Dokter'}
                    </div>
                </div>

                {/* Gold horizontal accent line positioned cleanly below the title with safe clearance */}
                <div
                    style={{
                        width: '120px',
                        height: '6px',
                        borderRadius: '3px',
                        background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 60%, transparent 100%)',
                        marginTop: '24px'
                    }}
                />
            </div>

            {/* 3. DOCTOR INFORMATION CARD - y: dynamic with doctorCardTop & doctorCardScale */}
            <div
                style={{
                    position: 'absolute',
                    left: '85px',
                    top: `${doctorCardTop}px`,
                    width: '530px',
                    minHeight: '150px',
                    zIndex: 30,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #d97706 100%)',
                    borderRadius: '24px',
                    padding: '20px 24px',
                    boxShadow: '0 14px 30px rgba(212, 175, 55, 0.28)',
                    border: '1.5px solid rgba(254, 240, 138, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '18px',
                    transform: `scale(${config.doctorCardScale || 1})`,
                    transformOrigin: 'top left'
                }}
            >
                {/* Circular Doctor Icon Badge */}
                <div
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#001f5c',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(0, 31, 92, 0.35)'
                    }}
                >
                    <User style={{ width: '30px', height: '30px', strokeWidth: 2.2 }} />
                </div>

                {/* Doctor Text Information */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h2
                        style={{
                            fontSize: config.doctorNameFontSize ? `${config.doctorNameFontSize}px` : nameFontSize,
                            fontWeight: 900,
                            color: config.doctorNameColor || '#001238',
                            lineHeight: 1.15,
                            letterSpacing: '-0.5px',
                            wordBreak: 'break-word'
                        }}
                    >
                        {doctorName}
                    </h2>
                    <p
                        style={{
                            fontSize: config.doctorSpecialtyFontSize ? `${config.doctorSpecialtyFontSize}px` : '17px',
                            fontWeight: 700,
                            color: config.doctorSpecialtyColor || '#001f5c',
                            marginTop: '4px',
                            lineHeight: 1.3
                        }}
                    >
                        Dokter Spesialis {specialtyTitle}
                    </p>
                </div>
            </div>

            {/* 4 & 5. SCHEDULE + REGISTRATION CONTAINER - y: dynamic with scheduleTop & scheduleGap */}
            <div
                style={{
                    position: 'absolute',
                    left: '85px',
                    top: `${scheduleTop}px`,
                    width: '530px',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: `${scheduleGap}px`
                }}
            >
                {/* 4. SCHEDULE SECTION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Heading: Jadwal Praktik with gold calendar icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar style={{ width: '26px', height: '26px', color: '#d97706', strokeWidth: 2.3 }} />
                        <h3 style={{ fontSize: '28px', fontWeight: 900, color: titleTextColor, letterSpacing: '-0.5px' }}>
                            Jadwal Praktik
                        </h3>
                    </div>

                    {/* Schedule Table Container */}
                    <div
                        style={{
                            backgroundColor: theme.cardBg,
                            border: theme.cardBorder,
                            borderRadius: '22px',
                            padding: '20px 24px',
                            backdropFilter: 'blur(12px)',
                            boxShadow: theme.cardShadow,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}
                    >
                        {activeDays.length > 0 ? (
                            activeDays.map((day, idx) => {
                                const timeStr = schedule[day] || schedule[day.toLowerCase()];
                                return (
                                    <div
                                        key={day}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: '22px',
                                            fontWeight: 700,
                                            color: scheduleTextColor,
                                            paddingBottom: idx !== activeDays.length - 1 ? '10px' : '0',
                                            borderBottom: idx !== activeDays.length - 1 ? (currentThemeKey === 'white-gold' ? '1px solid rgba(0, 31, 92, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)') : 'none'
                                        }}
                                    >
                                        {/* Small gold calendar icon + Day name */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '135px', flexShrink: 0 }}>
                                            <Calendar style={{ width: '20px', height: '20px', color: '#f59e0b', flexShrink: 0, strokeWidth: 2.2 }} />
                                            <span style={{ fontWeight: 700, letterSpacing: '-0.2px' }}>
                                                 {day}
                                            </span>
                                        </div>

                                        {/* Vertical separator bar | */}
                                        <span style={{ color: currentThemeKey === 'white-gold' ? 'rgba(0, 31, 92, 0.25)' : 'rgba(255, 255, 255, 0.3)', margin: '0 12px', fontWeight: 300 }}>
                                            |
                                        </span>

                                        {/* Practice Hours */}
                                        <span style={{ fontWeight: 700, letterSpacing: '0.3px', flex: 1, textAlign: 'left', color: scheduleTextColor }}>
                                            {timeStr}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <p style={{ fontSize: '16px', fontStyle: 'italic', color: theme.subTextColor, padding: '8px 0' }}>
                                Informasi jadwal praktik dapat dikonfirmasi melalui aplikasi MySiloam.
                            </p>
                        )}
                    </div>
                </div>

                {/* 5. REGISTRATION & RESERVATION CARD (Sitting comfortably spaced below schedule) */}
                {!isSquare && config.customNote && (
                    <div
                        style={{
                            width: '100%',
                            backgroundColor: theme.cardBg,
                            border: theme.cardBorder,
                            borderRadius: '22px',
                            padding: '18px 24px',
                            backdropFilter: 'blur(12px)',
                            boxShadow: theme.cardShadow,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 900, fontSize: '18px' }}>
                            <Info style={{ width: '22px', height: '22px', strokeWidth: 2.5 }} />
                            <span>Pendaftaran & Reservasi</span>
                        </div>
                        <p style={{ fontSize: '15px', lineHeight: 1.45, color: theme.subTextColor, fontWeight: 500, margin: 0 }}>
                            {config.customNote.includes('MySiloam') ? (
                                <>
                                    Pendaftaran & reservasi jadwal dokter dapat dilakukan melalui Aplikasi <strong style={{ color: currentThemeKey === 'white-gold' ? '#001f5c' : '#ffffff', fontWeight: 800 }}>MySiloam</strong>.
                                </>
                            ) : (
                                config.customNote
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
