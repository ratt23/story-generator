import React, { useRef, useEffect, useState } from 'react';
import { useExecutiveDailyStory } from '../../context/ExecutiveDailyStoryContext';
import { getDoctorInitials } from '../../utils/imageHelper';
import { Calendar, Stethoscope } from 'lucide-react';

/**
 * Single Doctor Avatar with granular scale, position offset, rotation, flip & fallback
 */
const DoctorAvatar = ({
    avatar,
    name,
    photoScale = 1,
    photoOffsetX = 0,
    photoOffsetY = 0,
    photoRotate = 0,
    photoFlipX = false,
    size = 64
}) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [avatar]);

    const flipTransform = photoFlipX ? 'scaleX(-1)' : 'scaleX(1)';
    const imgTransform = `translate(calc(-50% + ${photoOffsetX || 0}%), calc(-50% + ${photoOffsetY || 0}%)) scale(${photoScale || 1}) rotate(${photoRotate || 0}deg) ${flipTransform}`;

    if (avatar && !hasError) {
        return (
            <div
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    border: '2px solid #001f5c',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 8px rgba(0, 31, 92, 0.15)',
                    position: 'relative'
                }}
            >
                <img
                    src={avatar}
                    alt={name}
                    crossOrigin="anonymous"
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        minWidth: '100%',
                        minHeight: '100%',
                        width: '100%',
                        height: 'auto',
                        maxWidth: 'none',
                        maxHeight: 'none',
                        objectFit: 'visible',
                        transform: imgTransform,
                        transformOrigin: 'center center',
                        display: 'block',
                        pointerEvents: 'none'
                    }}
                    onError={() => setHasError(true)}
                />
            </div>
        );
    }

    return (
        <div
            style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                border: '2px solid #001f5c',
                backgroundColor: '#001f5c',
                color: '#ffffff',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 8px rgba(0, 31, 92, 0.15)',
                fontWeight: 800,
                fontSize: `${Math.round(size * 0.3)}px`
            }}
        >
            {getDoctorInitials(name)}
        </div>
    );
};

// Helper to construct CSS Animation Name
const getAnimationName = (type) => {
    switch (type) {
        case 'pan-right':
            return 'edsAnimPanRight';
        case 'pan-left':
            return 'edsAnimPanLeft';
        case 'rise':
            return 'edsAnimRise';
        case 'drop':
            return 'edsAnimDrop';
        case 'fade':
            return 'edsAnimFade';
        case 'pop':
            return 'edsAnimPop';
        default:
            return 'none';
    }
};

export const ExecutiveDailyStoryCanvas = ({ canvasRef, videoElementRef, disableAnimations = false }) => {
    const { selectedDay, activeDoctors, config, animationKey } = useExecutiveDailyStory();
    const localVideoRef = useRef(null);

    // Sync external video ref
    useEffect(() => {
        if (videoElementRef && localVideoRef.current) {
            videoElementRef.current = localVideoRef.current;
        }
    }, [videoElementRef]);

    const dayText = config.customDayBadge || selectedDay;

    // Dynamic auto-padding calculation based on doctor count
    const count = activeDoctors.length;
    let computedRowSpacing = config.rowSpacing;
    let computedNameFontSize = config.nameFontSize;
    let computedSpecialtyFontSize = config.specialtyFontSize;
    let computedTimeFontSize = config.timeFontSize;
    let computedAvatarSize = config.avatarSize || 64;

    if (count >= 10) {
        computedRowSpacing = Math.min(computedRowSpacing, 5);
        computedNameFontSize = Math.min(computedNameFontSize, 17);
        computedSpecialtyFontSize = Math.min(computedSpecialtyFontSize, 11);
        computedTimeFontSize = Math.min(computedTimeFontSize, 17);
        computedAvatarSize = Math.min(computedAvatarSize, 56);
    } else if (count >= 8) {
        computedRowSpacing = Math.min(computedRowSpacing, 7);
        computedNameFontSize = Math.min(computedNameFontSize, 18);
        computedSpecialtyFontSize = Math.min(computedSpecialtyFontSize, 12);
        computedTimeFontSize = Math.min(computedTimeFontSize, 18);
        computedAvatarSize = Math.min(computedAvatarSize, 60);
    }

    // Animation Configurations
    const duration = `${config.animationDuration || 0.8}s`;
    const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';

    const tableAnimName = disableAnimations ? 'none' : getAnimationName(config.tableAnimation || 'pan-right');
    const badgeAnimName = disableAnimations ? 'none' : getAnimationName(config.dayBadgeAnimation || 'rise');
    const titleAnimName = disableAnimations ? 'none' : getAnimationName(config.titleAnimation || 'fade');
    const logoAnimName = disableAnimations ? 'none' : getAnimationName(config.logoAnimation || 'fade');
    const footerAnimName = disableAnimations ? 'none' : getAnimationName(config.footersAnimation || 'fade');

    return (
        <div
            ref={canvasRef}
            key={`canvas-key-${animationKey}`}
            id="executive-daily-story-canvas"
            className="select-none relative overflow-hidden"
            style={{
                width: '1080px',
                height: '1920px',
                position: 'relative',
                fontFamily: '"Poppins", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                backgroundColor: '#001238'
            }}
        >
            {/* Embedded Keyframe Styles for Smooth Canva-Style Animations */}
            <style>
                {`
                @keyframes edsAnimPanRight {
                    0% {
                        opacity: 0;
                        transform: translate3d(-180px, 0, 0) scale(var(--eds-scale, 1));
                    }
                    100% {
                        opacity: 1;
                        transform: translate3d(0, 0, 0) scale(var(--eds-scale, 1));
                    }
                }
                @keyframes edsAnimPanLeft {
                    0% {
                        opacity: 0;
                        transform: translate3d(180px, 0, 0) scale(var(--eds-scale, 1));
                    }
                    100% {
                        opacity: 1;
                        transform: translate3d(0, 0, 0) scale(var(--eds-scale, 1));
                    }
                }
                @keyframes edsAnimRise {
                    0% {
                        opacity: 0;
                        transform: translate3d(0, 70px, 0) scale(var(--eds-scale, 1));
                    }
                    100% {
                        opacity: 1;
                        transform: translate3d(0, 0, 0) scale(var(--eds-scale, 1));
                    }
                }
                @keyframes edsAnimDrop {
                    0% {
                        opacity: 0;
                        transform: translate3d(0, -70px, 0) scale(var(--eds-scale, 1));
                    }
                    100% {
                        opacity: 1;
                        transform: translate3d(0, 0, 0) scale(var(--eds-scale, 1));
                    }
                }
                @keyframes edsAnimFade {
                    0% {
                        opacity: 0;
                        transform: scale(var(--eds-scale, 1));
                    }
                    100% {
                        opacity: 1;
                        transform: scale(var(--eds-scale, 1));
                    }
                }
                @keyframes edsAnimPop {
                    0% {
                        opacity: 0;
                        transform: scale(calc(var(--eds-scale, 1) * 0.65));
                    }
                    70% {
                        transform: scale(calc(var(--eds-scale, 1) * 1.04));
                    }
                    100% {
                        opacity: 1;
                        transform: scale(var(--eds-scale, 1));
                    }
                }
                `}
            </style>

            {/* 1. BACKGROUND VIDEO */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '1080px',
                    height: '1920px',
                    zIndex: 1,
                    overflow: 'hidden'
                }}
            >
                <video
                    ref={localVideoRef}
                    src={config.bgVideoUrl || '/asset2/Background.webm'}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                        width: '1080px',
                        height: '1920px',
                        objectFit: 'cover',
                        filter: `brightness(${config.videoBrightness || 100}%) contrast(${config.videoContrast || 100}%) saturate(${config.videoSaturate || 100}%)`,
                        display: 'block'
                    }}
                />

                {/* Dark/light tint overlay */}
                {config.overlayDarkness > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: `rgba(0, 18, 56, ${config.overlayDarkness / 100})`,
                            pointerEvents: 'none'
                        }}
                    />
                )}
            </div>

            {/* 2. TOP LOGO (Left) */}
            {config.showLogo !== false && (
                <div
                    style={{
                        position: 'absolute',
                        top: `${64 + (config.logoOffsetY || 0)}px`,
                        left: `${44 + (config.logoOffsetX || 0)}px`,
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        transformOrigin: 'top left',
                        '--eds-scale': config.logoScale || 1,
                        animationName: logoAnimName,
                        animationDuration: duration,
                        animationTimingFunction: easing,
                        animationDelay: '0.05s',
                        animationFillMode: 'both'
                    }}
                >
                    <img
                        src={config.logoUrl || '/asset2/webp/logo.webp'}
                        alt="Logo Siloam"
                        crossOrigin="anonymous"
                        style={{
                            height: `${config.logoHeight || 52}px`,
                            maxWidth: '300px',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 4px 10px rgba(0, 31, 92, 0.2))'
                        }}
                    />
                </div>
            )}

            {/* 3. HEADER TITLE (EXECUTIVE Clinic) */}
            {config.showTitle !== false && (
                <div
                    style={{
                        position: 'absolute',
                        top: `${220 + (config.headerOffsetY || 0)}px`,
                        left: `${0 + (config.headerOffsetX || 0)}px`,
                        width: '1080px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 20,
                        pointerEvents: 'none',
                        transformOrigin: 'top center',
                        '--eds-scale': config.headerScale || 1,
                        animationName: titleAnimName,
                        animationDuration: duration,
                        animationTimingFunction: easing,
                        animationDelay: '0.1s',
                        animationFillMode: 'both'
                    }}
                >
                    <img
                        src={config.headerTitleUrl || '/asset2/webp/1.webp'}
                        alt="EXECUTIVE Clinic"
                        crossOrigin="anonymous"
                        style={{
                            width: `${config.headerWidth || 720}px`,
                            maxWidth: '740px',
                            height: 'auto',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 6px 16px rgba(0, 20, 60, 0.25))'
                        }}
                    />
                </div>
            )}

            {/* 4. DAY BADGE PILL (e.g. 📅 Sabtu) - Animates with Rise (Bawah ke Atas) */}
            {config.showDayBadge !== false && (
                <div
                    style={{
                        position: 'absolute',
                        top: `${500 + (config.dayBadgeOffsetY || 0)}px`,
                        left: `${0 + (config.dayBadgeOffsetX || 0)}px`,
                        width: '1080px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 20,
                        transformOrigin: 'top center',
                        '--eds-scale': config.dayBadgeScale || 1,
                        animationName: badgeAnimName,
                        animationDuration: duration,
                        animationTimingFunction: easing,
                        animationDelay: `${config.animationDelayBadge || 0.15}s`,
                        animationFillMode: 'both'
                    }}
                >
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '11px 46px',
                            borderRadius: '9999px',
                            backgroundColor: config.dayBadgeBgColor || '#001f5c',
                            color: config.dayBadgeTextColor || '#ffffff',
                            boxShadow: '0 8px 24px rgba(0, 31, 92, 0.35)',
                            border: '1.5px solid rgba(255, 255, 255, 0.25)'
                        }}
                    >
                        <Calendar style={{ width: '28px', height: '28px', strokeWidth: 2.3 }} />
                        <span
                            style={{
                                fontSize: `${config.dayBadgeFontSize || 28}px`,
                                fontWeight: 800,
                                letterSpacing: '0.5px'
                            }}
                        >
                            {dayText}
                        </span>
                    </div>
                </div>
            )}

            {/* 5. FROSTED GLASS TABLE CONTAINER - Animates with Pan ke Kanan */}
            {config.showTable !== false && (
                <div
                    style={{
                        position: 'absolute',
                        top: `${600 + (config.tableOffsetY || 0)}px`,
                        left: `${((1080 - (config.tableWidth || 960)) / 2) + (config.tableOffsetX || 0)}px`,
                        width: `${config.tableWidth || 960}px`,
                        zIndex: 20,
                        transformOrigin: 'top center',
                        '--eds-scale': config.tableScale || 1,
                        animationName: tableAnimName,
                        animationDuration: duration,
                        animationTimingFunction: easing,
                        animationDelay: `${config.animationDelayTable || 0.35}s`,
                        animationFillMode: 'both'
                    }}
                >
                    {/* Table Header Bar (Navy Blue) */}
                    <div
                        style={{
                            width: '100%',
                            height: `${config.tableHeaderHeight || 70}px`,
                            backgroundColor: '#001f5c',
                            borderRadius: '26px 26px 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 44px',
                            color: '#ffffff',
                            boxShadow: '0 6px 18px rgba(0, 31, 92, 0.25)'
                        }}
                    >
                        <span
                            style={{
                                fontSize: `${config.tableHeaderFontSize || 26}px`,
                                fontWeight: 800,
                                letterSpacing: '-0.3px'
                            }}
                        >
                            {config.tableTitleName || 'Nama Dokter'}
                        </span>
                        <span
                            style={{
                                fontSize: `${config.tableHeaderFontSize || 26}px`,
                                fontWeight: 800,
                                letterSpacing: '-0.3px'
                            }}
                        >
                            {config.tableTitleSchedule || 'Jadwal'}
                        </span>
                    </div>

                    {/* Table Body Card (Frosted Glass) */}
                    <div
                        style={{
                            width: '100%',
                            backgroundColor: `rgba(255, 255, 255, ${config.cardOpacity || 0.92})`,
                            backdropFilter: `blur(${config.cardBlur || 20}px)`,
                            WebkitBackdropFilter: `blur(${config.cardBlur || 20}px)`,
                            borderRadius: '0 0 26px 26px',
                            border: `${config.cardBorderWidth || 1.5}px solid rgba(255, 255, 255, 0.85)`,
                            borderTop: 'none',
                            boxShadow: '0 20px 48px rgba(0, 31, 92, 0.2)',
                            padding: `${config.tablePaddingY || 12}px ${config.tablePaddingX || 28}px 18px ${config.tablePaddingX || 28}px`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0'
                        }}
                    >
                        {activeDoctors.length > 0 ? (
                            activeDoctors.map((doc, idx) => (
                                <div
                                    key={doc.id || idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: `${computedRowSpacing}px 8px`,
                                        borderBottom: idx !== activeDoctors.length - 1 ? '1.5px solid rgba(0, 31, 92, 0.08)' : 'none'
                                    }}
                                >
                                    {/* Left: Doctor Avatar + Name & Specialty */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0, paddingRight: '16px' }}>
                                        <DoctorAvatar
                                            avatar={doc.avatar}
                                            name={doc.name}
                                            photoScale={doc.photoScale}
                                            photoOffsetX={doc.photoOffsetX}
                                            photoOffsetY={doc.photoOffsetY}
                                            photoRotate={doc.photoRotate}
                                            photoFlipX={doc.photoFlipX}
                                            size={computedAvatarSize}
                                        />

                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                            <span
                                                style={{
                                                    fontSize: `${computedNameFontSize}px`,
                                                    fontWeight: 800,
                                                    color: config.nameColor || '#001f5c',
                                                    lineHeight: 1.22,
                                                    letterSpacing: '-0.3px',
                                                    wordBreak: 'break-word'
                                                }}
                                            >
                                                {doc.name}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: `${computedSpecialtyFontSize}px`,
                                                    fontWeight: 600,
                                                    color: config.specialtyColor || '#475569',
                                                    marginTop: '2px',
                                                    lineHeight: 1.25
                                                }}
                                            >
                                                {doc.specialty}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right: Schedule Time Slot */}
                                    <div
                                        style={{
                                            fontSize: `${computedTimeFontSize}px`,
                                            fontWeight: 800,
                                            color: config.timeColor || '#001f5c',
                                            letterSpacing: '0.2px',
                                            whiteSpace: 'nowrap',
                                            textAlign: 'right',
                                            flexShrink: 0
                                        }}
                                    >
                                        {doc.time || '14:00–17:00'}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                                <Stethoscope style={{ width: '48px', height: '48px', margin: '0 auto 12px', color: '#001f5c', opacity: 0.4 }} />
                                <p style={{ fontSize: '20px', fontWeight: 600 }}>Tidak ada jadwal dokter untuk hari ini.</p>
                                <p style={{ fontSize: '15px', marginTop: '6px' }}>Silakan aktifkan dokter atau pilih hari lainnya di panel sebelah kiri.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 6. FOOTER SECTION */}
            {config.showFooters !== false && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        height: '140px',
                        zIndex: 20,
                        pointerEvents: 'none',
                        '--eds-scale': 1,
                        animationName: footerAnimName,
                        animationDuration: duration,
                        animationTimingFunction: easing,
                        animationDelay: `${config.animationDelayFooters || 0.55}s`,
                        animationFillMode: 'both'
                    }}
                >
                    {/* Left: Address Footer */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: `${36 + (config.footerKiriOffsetY || config.footerOffsetY || 0)}px`,
                            left: `${44 + (config.footerKiriOffsetX || 0)}px`,
                            transform: `scale(${config.footerKiriScale || 1})`,
                            transformOrigin: 'bottom left'
                        }}
                    >
                        <img
                            src={config.footerKiriUrl || '/asset2/webp/footer kiri.webp'}
                            alt="RSU Siloam Ambon"
                            crossOrigin="anonymous"
                            style={{
                                height: '56px',
                                maxWidth: '380px',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.15))'
                            }}
                        />
                    </div>

                    {/* Right: 24/7 Call Center Footer */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: `${36 + (config.footerKananOffsetY || config.footerOffsetY || 0)}px`,
                            right: `${44 - (config.footerKananOffsetX || 0)}px`,
                            transform: `scale(${config.footerKananScale || 1})`,
                            transformOrigin: 'bottom right'
                        }}
                    >
                        <img
                            src={config.footerKananUrl || '/asset2/webp/footer kanan.webp'}
                            alt="24/7 1-500-911"
                            crossOrigin="anonymous"
                            style={{
                                height: '56px',
                                maxWidth: '380px',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.15))'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
