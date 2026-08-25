import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useExecutiveDailyStory } from '../../context/ExecutiveDailyStoryContext';
import { ExecutiveDailyStoryCanvas } from './ExecutiveDailyStoryCanvas';
import { ZoomControls } from '../Preview/ZoomControls';
import { SuccessModal } from '../UI/SuccessModal';
import { downloadPngFile, downloadVideoFile } from '../../utils/downloadHelper';
import { Download, Loader2, Video as VideoIcon, Sparkles, Play } from 'lucide-react';

export const ExecutiveDailyStoryWorkspace = () => {
    const { selectedDay, activeDoctors, config, replayAnimation } = useExecutiveDailyStory();
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const canvasRef = useRef(null);
    const videoElementRef = useRef(null);

    // Pan / Zoom State for interactive preview
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.25 });
    const [isPanning, setIsPanning] = useState(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    // Multi-touch pinch-to-zoom tracking
    const touchState = useRef({
        mode: 'none',
        lastDist: 0,
        lastCenter: { x: 0, y: 0 },
        lastTouch: { x: 0, y: 0 }
    });

    // Download / Export State
    const [isGeneratingPng, setIsGeneratingPng] = useState(false);
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [disableAnimForSnapshot, setDisableAnimForSnapshot] = useState(false);

    const canvasWidth = 1080;
    const canvasHeight = 1920;

    // Calculate Fit to Screen
    const fitToScreen = useCallback(() => {
        if (!containerRef.current) return;
        const container = containerRef.current.getBoundingClientRect();

        const targetW = 1080;
        const targetH = 1920;

        const cWidth = container.width || window.innerWidth;
        const cHeight = container.height || (window.innerHeight - 56);

        const isSmallScreen = cWidth < 640 || cHeight < 500;
        const padding = isSmallScreen ? 12 : 32;

        const availableWidth = Math.max(100, cWidth - padding * 2);
        const availableHeight = Math.max(100, cHeight - padding * 2);

        const scaleX = availableWidth / targetW;
        const scaleY = availableHeight / targetH;
        const newScale = Math.min(scaleX, scaleY) * 0.98;

        const x = (cWidth - (targetW * newScale)) / 2;
        const y = (cHeight - (targetH * newScale)) / 2;

        setTransform({ x, y, scale: Math.max(0.08, newScale) });
    }, []);

    // Handle Window Resize and Orientation Change
    useEffect(() => {
        const handleResize = () => {
            requestAnimationFrame(fitToScreen);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        let resizeObserver;
        if (containerRef.current) {
            resizeObserver = new ResizeObserver(() => handleResize());
            resizeObserver.observe(containerRef.current);
        }

        const timer1 = setTimeout(fitToScreen, 100);
        const timer2 = setTimeout(fitToScreen, 350);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if (resizeObserver) resizeObserver.disconnect();
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [fitToScreen]);

    // Zoom Point Helper
    const zoomPoint = (factor, centerX, centerY) => {
        setTransform(prev => {
            let newScale = prev.scale * factor;
            if (newScale < 0.05) newScale = 0.05;
            if (newScale > 3) newScale = 3;

            const xs = (centerX - prev.x) / prev.scale;
            const ys = (centerY - prev.y) / prev.scale;

            return {
                x: centerX - xs * newScale,
                y: centerY - ys * newScale,
                scale: newScale
            };
        });
    };

    // Mouse & Wheel
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY;
        const factor = delta > 0 ? 0.9 : 1.1;

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        zoomPoint(factor, mouseX, mouseY);
    };

    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        setIsPanning(true);
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        if (!isPanning) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };

        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    };

    const handleMouseUp = () => setIsPanning(false);

    // Touch Event Handlers
    const handleTouchStart = (e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        if (e.touches.length === 1) {
            touchState.current.mode = 'pan';
            touchState.current.lastTouch = {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else if (e.touches.length === 2) {
            touchState.current.mode = 'pinch';
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const center = {
                x: ((t1.clientX + t2.clientX) / 2) - rect.left,
                y: ((t1.clientY + t2.clientY) / 2) - rect.top
            };

            touchState.current.lastDist = dist;
            touchState.current.lastCenter = center;
        }
    };

    const handleTouchMove = (e) => {
        if (!containerRef.current) return;
        e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();

        if (e.touches.length === 1 && touchState.current.mode === 'pan') {
            const currentX = e.touches[0].clientX - rect.left;
            const currentY = e.touches[0].clientY - rect.top;
            const dx = currentX - touchState.current.lastTouch.x;
            const dy = currentY - touchState.current.lastTouch.y;

            touchState.current.lastTouch = { x: currentX, y: currentY };
            setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        } else if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const center = {
                x: ((t1.clientX + t2.clientX) / 2) - rect.left,
                y: ((t1.clientY + t2.clientY) / 2) - rect.top
            };

            if (touchState.current.lastDist > 0) {
                const factor = dist / touchState.current.lastDist;
                zoomPoint(factor, center.x, center.y);
            }

            touchState.current.lastDist = dist;
            touchState.current.lastCenter = center;
        }
    };

    const handleTouchEnd = () => {
        touchState.current.mode = 'none';
        touchState.current.lastDist = 0;
    };

    // ========================================================
    // PNG Generator via html2canvas (Snapshot with Video Frame)
    // ========================================================
    const handleGeneratePng = async () => {
        const targetEl = document.getElementById('executive-daily-story-canvas');
        const contentEl = contentRef.current;
        const videoEl = videoElementRef.current;

        if (!targetEl || !contentEl) {
            alert('Kanvas tidak ditemukan.');
            return;
        }

        setIsGeneratingPng(true);
        setDisableAnimForSnapshot(true);
        let tempFrameImg = null;

        try {
            if (document.fonts) {
                await document.fonts.ready;
            }

            // Capture current video frame onto an offscreen canvas
            if (videoEl && videoEl.readyState >= 2) {
                try {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = 1080;
                    tempCanvas.height = 1920;
                    const ctx = tempCanvas.getContext('2d');
                    ctx.drawImage(videoEl, 0, 0, 1080, 1920);

                    const frameDataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
                    tempFrameImg = document.createElement('img');
                    tempFrameImg.src = frameDataUrl;
                    tempFrameImg.style.position = 'absolute';
                    tempFrameImg.style.top = '0';
                    tempFrameImg.style.left = '0';
                    tempFrameImg.style.width = '1080px';
                    tempFrameImg.style.height = '1920px';
                    tempFrameImg.style.objectFit = 'cover';
                    tempFrameImg.style.zIndex = '2';
                    targetEl.appendChild(tempFrameImg);
                } catch (vErr) {
                    console.warn('[ExecutiveDailyStory] Could not snapshot video frame:', vErr);
                }
            }

            // Save transform & unscale for crisp 1:1 capture
            const savedTransform = contentEl.style.transform;
            const savedTransition = contentEl.style.transition;

            contentEl.style.transition = 'none';
            contentEl.style.transform = 'none';

            await new Promise((r) => requestAnimationFrame(r));
            await new Promise((r) => setTimeout(r, 60)); // Ensure styles settled

            // High-resolution html2canvas capture
            const canvas = await html2canvas(targetEl, {
                scale: 2, // 2x scale: 2160x3840
                width: canvasWidth,
                height: canvasHeight,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#001238',
                logging: false,
                imageTimeout: 20000
            });

            // Cleanup temp frame image
            if (tempFrameImg && targetEl.contains(tempFrameImg)) {
                targetEl.removeChild(tempFrameImg);
            }

            // Restore preview transform
            contentEl.style.transform = savedTransform;
            contentEl.style.transition = savedTransition;
            setDisableAnimForSnapshot(false);

            // Convert to PNG Blob
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    setIsGeneratingPng(false);
                    alert('Gagal menghasilkan file gambar PNG.');
                    return;
                }

                const filename = `jadwal-executive-${selectedDay.toLowerCase()}.png`;
                const blobUrl = URL.createObjectURL(blob);

                setResult({
                    blob,
                    url: blobUrl,
                    filename,
                    isVideo: false
                });

                try {
                    await downloadPngFile(blob, filename);
                } catch (downloadErr) {
                    console.warn('[ExecutiveDailyStoryWorkspace] Download fallback:', downloadErr);
                }

                setIsGeneratingPng(false);
            }, 'image/png');

        } catch (err) {
            console.error('[ExecutiveDailyStoryWorkspace] Generate error:', err);
            if (tempFrameImg && targetEl.contains(tempFrameImg)) {
                targetEl.removeChild(tempFrameImg);
            }
            if (contentRef.current) {
                contentRef.current.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
            }
            setDisableAnimForSnapshot(false);
            alert(`Gagal membuat gambar: ${err.message || 'Terjadi kesalahan'}`);
            setIsGeneratingPng(false);
        }
    };

// Helper to patch WebM duration header so video players show exact duration (00:20)
function fixWebmDuration(blob, durationMs) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function () {
            try {
                const buffer = reader.result;
                const view = new DataView(buffer);
                const bytes = new Uint8Array(buffer);
                let pos = -1;
                for (let i = 0; i < Math.min(bytes.length - 10, 4096); i++) {
                    if (bytes[i] === 0x44 && bytes[i + 1] === 0x89) {
                        pos = i + 2;
                        break;
                    }
                }
                if (pos !== -1) {
                    const len = bytes[pos];
                    if (len === 0x84) {
                        view.setFloat32(pos + 1, durationMs, false);
                    } else if (len === 0x88) {
                        view.setFloat64(pos + 1, durationMs, false);
                    }
                }
                resolve(new Blob([buffer], { type: blob.type }));
            } catch {
                resolve(blob);
            }
        };
        reader.onerror = () => resolve(blob);
        reader.readAsArrayBuffer(blob);
    });
}

    // ========================================================
    // Video Story Generator — Pure Canvas 2D (No html2canvas)
    // Draws every element directly onto canvas for 100% reliable output
    // ========================================================
    const handleRecordVideo = async () => {
        const videoEl = videoElementRef.current;

        if (!videoEl) {
            alert('Elemen video background belum siap.');
            return;
        }

        setIsRecordingVideo(true);
        setRecordingProgress(0);

        let recordCanvas = null;

        try {
            if (document.fonts) {
                await document.fonts.ready;
            }

            // 1. Pre-load all image assets so drawImage works synchronously in renderFrame
            const loadImg = (src) => new Promise((resolve) => {
                if (!src) { resolve(null); return; }
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = src;
            });

            const [logoImg, titleImg, footerKiriImg, footerKananImg] = await Promise.all([
                config.showLogo !== false ? loadImg(config.logoUrl || '/asset2/webp/logo.webp') : Promise.resolve(null),
                config.showTitle !== false ? loadImg(config.headerTitleUrl || '/asset2/webp/1.webp') : Promise.resolve(null),
                config.showFooters !== false ? loadImg(config.footerKiriUrl || '/asset2/webp/footer kiri.webp') : Promise.resolve(null),
                config.showFooters !== false ? loadImg(config.footerKananUrl || '/asset2/webp/footer kanan.webp') : Promise.resolve(null),
            ]);

            // Pre-load doctor avatars
            const doctorAvatarImgs = await Promise.all(
                activeDoctors.map(doc => doc.avatar ? loadImg(doc.avatar) : Promise.resolve(null))
            );

            // 2. Setup 1080x1920 composite canvas
            recordCanvas = document.createElement('canvas');
            recordCanvas.id = 'eds-active-record-canvas';
            recordCanvas.width = 1080;
            recordCanvas.height = 1920;
            recordCanvas.style.cssText = 'position:fixed;left:0;top:0;width:1080px;height:1920px;z-index:-9999;opacity:0.01;pointer-events:none;';
            document.body.appendChild(recordCanvas);

            const ctx = recordCanvas.getContext('2d', { alpha: false });

            // Font config from settings
            const nameFontSize = config.nameFontSize ?? 20;
            const specialtyFontSize = config.specialtyFontSize ?? 13;
            const timeFontSize = config.timeFontSize ?? 20;
            const avatarSize = config.avatarSize ?? 64;
            const rowSpacing = config.rowSpacing ?? 10;
            const tableWidth = config.tableWidth ?? 960;
            const tableOffsetX = config.tableOffsetX ?? 0;
            const tableOffsetY = config.tableOffsetY ?? 0;
            const tableLeft = ((1080 - tableWidth) / 2) + tableOffsetX;
            const tableTop = 600 + tableOffsetY;
            const tableHeaderHeight = config.tableHeaderHeight ?? 70;
            const tablePaddingX = config.tablePaddingX ?? 28;
            const tablePaddingY = config.tablePaddingY ?? 12;
            const headerFontSize = config.tableHeaderFontSize ?? 26;
            const cardBorderRadius = 26;

            // Helper: convert hex + opacity to rgba string for canvas fillStyle
            const hexToRgba = (hex, alpha) => {
                const h = (hex || '#ffffff').replace('#', '');
                const r = parseInt(h.substring(0, 2), 16) || 255;
                const g = parseInt(h.substring(2, 4), 16) || 255;
                const b = parseInt(h.substring(4, 6), 16) || 255;
                return `rgba(${r},${g},${b},${alpha ?? 1})`;
            };

            // Helper: draw rounded rectangle path
            const roundRect = (cx, x, y, w, h, tl, tr, br, bl) => {
                cx.beginPath();
                cx.moveTo(x + tl, y);
                cx.lineTo(x + w - tr, y);
                cx.quadraticCurveTo(x + w, y, x + w, y + tr);
                cx.lineTo(x + w, y + h - br);
                cx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
                cx.lineTo(x + bl, y + h);
                cx.quadraticCurveTo(x, y + h, x, y + h - bl);
                cx.lineTo(x, y + tl);
                cx.quadraticCurveTo(x, y, x + tl, y);
                cx.closePath();
            };

            // Helper: draw circular avatar clip + image or initials
            const drawAvatar = (cx, doc, avatarImg, x, y, size) => {
                cx.save();
                cx.beginPath();
                cx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                cx.clip();
                if (avatarImg) {
                    cx.drawImage(avatarImg, x, y, size, size);
                } else {
                    cx.fillStyle = '#001f5c';
                    cx.fillRect(x, y, size, size);
                    cx.fillStyle = '#ffffff';
                    cx.font = `800 ${Math.round(size * 0.3)}px "Plus Jakarta Sans", Poppins, sans-serif`;
                    cx.textAlign = 'center';
                    cx.textBaseline = 'middle';
                    const initials = (doc.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
                    cx.fillText(initials, x + size / 2, y + size / 2);
                }
                cx.restore();
                // Circle border
                cx.save();
                cx.strokeStyle = '#001f5c';
                cx.lineWidth = 2;
                cx.beginPath();
                cx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                cx.stroke();
                cx.restore();
            };

            // Main draw function — called every rAF during recording
            const drawFrame = () => {
                // A. Base navy background
                ctx.fillStyle = '#001238';
                ctx.fillRect(0, 0, 1080, 1920);

                // B. Live video background
                if (videoEl && videoEl.readyState >= 2) {
                    ctx.save();
                    ctx.filter = `brightness(${config.videoBrightness || 100}%) contrast(${config.videoContrast || 100}%) saturate(${config.videoSaturate || 100}%)`;
                    ctx.drawImage(videoEl, 0, 0, 1080, 1920);
                    ctx.restore();
                }

                // C. Overlay darkness tint
                if ((config.overlayDarkness || 0) > 0) {
                    ctx.fillStyle = `rgba(0,18,56,${config.overlayDarkness / 100})`;
                    ctx.fillRect(0, 0, 1080, 1920);
                }

                // D. Logo (top-left)
                if (config.showLogo !== false && logoImg) {
                    const logoH = config.logoHeight || 52;
                    const logoScale = config.logoScale || 1;
                    const logoX = 44 + (config.logoOffsetX || 0);
                    const logoY = 64 + (config.logoOffsetY || 0);
                    const logoW = logoImg.width * (logoH / logoImg.height) * logoScale;
                    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH * logoScale);
                }

                // E. Header title image (centered)
                if (config.showTitle !== false && titleImg) {
                    const titleW = (config.headerWidth || 720) * (config.headerScale || 1);
                    const titleH = titleImg.height * (titleW / titleImg.width);
                    const titleX = (1080 - titleW) / 2 + (config.headerOffsetX || 0);
                    const titleY = 220 + (config.headerOffsetY || 0);
                    ctx.drawImage(titleImg, titleX, titleY, titleW, titleH);
                }

                // F. Day badge pill
                if (config.showDayBadge !== false) {
                    const dayText = config.customDayBadge || selectedDay;
                    const badgeFontSize = config.dayBadgeFontSize || 28;
                    ctx.font = `800 ${badgeFontSize}px "Plus Jakarta Sans", Poppins, sans-serif`;
                    const textW = ctx.measureText(dayText).width;
                    const iconW = 28;
                    const gap = 12;
                    const padH = 11;
                    const padV = 46;
                    const badgeW = padV * 2 + iconW + gap + textW;
                    const badgeH = badgeFontSize + padH * 2;
                    const badgeX = (1080 - badgeW) / 2 + (config.dayBadgeOffsetX || 0);
                    const badgeY = 500 + (config.dayBadgeOffsetY || 0);

                    ctx.save();
                    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2, badgeH / 2, badgeH / 2, badgeH / 2);
                    ctx.fillStyle = config.dayBadgeBgColor || '#001f5c';
                    ctx.fill();
                    ctx.restore();

                    // Badge text
                    ctx.save();
                    ctx.fillStyle = config.dayBadgeTextColor || '#ffffff';
                    ctx.font = `800 ${badgeFontSize}px "Plus Jakarta Sans", Poppins, sans-serif`;
                    ctx.textBaseline = 'middle';
                    ctx.fillText(dayText, badgeX + padV + iconW + gap, badgeY + badgeH / 2);
                    ctx.restore();
                }

                // G. Schedule table card
                if (config.showTable !== false) {
                    // G1. Table header bar (rounded top)
                    roundRect(ctx, tableLeft, tableTop, tableWidth, tableHeaderHeight, cardBorderRadius, cardBorderRadius, 0, 0);
                    ctx.fillStyle = config.tableHeaderBgColor || '#001f5c';
                    ctx.fill();

                    // Header labels
                    ctx.save();
                    ctx.fillStyle = config.tableHeaderTextColor || '#ffffff';
                    ctx.font = `800 ${headerFontSize}px "Plus Jakarta Sans", Poppins, sans-serif`;
                    ctx.textBaseline = 'middle';
                    ctx.fillText(config.tableTitleName || 'Nama Dokter', tableLeft + 44, tableTop + tableHeaderHeight / 2);
                    ctx.textAlign = 'right';
                    ctx.fillText(config.tableTitleSchedule || 'Jadwal', tableLeft + tableWidth - 44, tableTop + tableHeaderHeight / 2);
                    ctx.restore();

                    // G2. Table body card — solid white (or user-configured color)
                    const cardOpacity = Number(config.cardOpacity ?? 1);
                    const cardBgColor = (() => {
                        const hex = (config.cardBgColor || '#ffffff').replace('#', '');
                        const r = parseInt(hex.substring(0, 2), 16) || 255;
                        const g = parseInt(hex.substring(2, 4), 16) || 255;
                        const b = parseInt(hex.substring(4, 6), 16) || 255;
                        return `rgba(${r},${g},${b},${cardOpacity})`;
                    })();

                    // Calculate total body height
                    const rowHeight = avatarSize + rowSpacing * 2 + 4;
                    const bodyHeight = activeDoctors.length > 0
                        ? activeDoctors.length * rowHeight + tablePaddingY * 2
                        : 120;

                    const bodyTop = tableTop + tableHeaderHeight;
                    roundRect(ctx, tableLeft, bodyTop, tableWidth, bodyHeight, 0, 0, cardBorderRadius, cardBorderRadius);
                    ctx.fillStyle = cardBgColor;
                    ctx.fill();

                    // Table body border
                    ctx.save();
                    ctx.strokeStyle = config.cardBorderColor || 'rgba(255,255,255,0.9)';
                    ctx.lineWidth = config.cardBorderWidth || 1.5;
                    roundRect(ctx, tableLeft, bodyTop, tableWidth, bodyHeight, 0, 0, cardBorderRadius, cardBorderRadius);
                    ctx.stroke();
                    ctx.restore();

                    // G3. Doctor rows
                    activeDoctors.forEach((doc, idx) => {
                        const rowY = bodyTop + tablePaddingY + idx * rowHeight + rowSpacing;

                        // Avatar
                        const avatarX = tableLeft + tablePaddingX;
                        const avatarY = rowY;
                        drawAvatar(ctx, doc, doctorAvatarImgs[idx], avatarX, avatarY, avatarSize);

                        // Doctor name
                        ctx.save();
                        ctx.fillStyle = config.nameColor || '#001f5c';
                        ctx.font = `800 ${nameFontSize}px "Plus Jakarta Sans", Poppins, sans-serif`;
                        ctx.textBaseline = 'alphabetic';
                        const textX = avatarX + avatarSize + 16;
                        ctx.fillText(doc.name || '', textX, rowY + nameFontSize + 2);
                        ctx.restore();

                        // Specialty
                        ctx.save();
                        ctx.fillStyle = config.specialtyColor || '#475569';
                        ctx.font = `600 ${specialtyFontSize}px "Plus Jakarta Sans", Poppins, sans-serif`;
                        ctx.textBaseline = 'alphabetic';
                        ctx.fillText(doc.specialty || '', textX, rowY + nameFontSize + 6 + specialtyFontSize);
                        ctx.restore();

                        // Time (right-aligned)
                        ctx.save();
                        ctx.fillStyle = config.timeColor || '#001f5c';
                        ctx.font = `800 ${timeFontSize}px "Plus Jakarta Sans", Poppins, sans-serif`;
                        ctx.textBaseline = 'middle';
                        ctx.textAlign = 'right';
                        ctx.fillText(doc.time || '14:00–17:00', tableLeft + tableWidth - tablePaddingX, rowY + avatarSize / 2);
                        ctx.restore();

                        // Row separator line
                        if (idx < activeDoctors.length - 1) {
                            ctx.save();
                            ctx.strokeStyle = 'rgba(0,31,92,0.08)';
                            ctx.lineWidth = 1.5;
                            ctx.beginPath();
                            ctx.moveTo(tableLeft + tablePaddingX, rowY + avatarSize + rowSpacing);
                            ctx.lineTo(tableLeft + tableWidth - tablePaddingX, rowY + avatarSize + rowSpacing);
                            ctx.stroke();
                            ctx.restore();
                        }
                    });
                }

                // H. Footer images
                if (config.showFooters !== false) {
                    const footerH = 56;
                    const footerBottom = 1920 - 36;

                    if (footerKiriImg) {
                        const scale = config.footerKiriScale || 1;
                        const w = footerKiriImg.width * (footerH / footerKiriImg.height) * scale;
                        const x = 44 + (config.footerKiriOffsetX || 0);
                        const y = footerBottom - footerH * scale + (config.footerKiriOffsetY || 0);
                        ctx.drawImage(footerKiriImg, x, y, w, footerH * scale);
                    }
                    if (footerKananImg) {
                        const scale = config.footerKananScale || 1;
                        const w = footerKananImg.width * (footerH / footerKananImg.height) * scale;
                        const x = 1080 - 44 - w + (config.footerKananOffsetX || 0);
                        const y = footerBottom - footerH * scale + (config.footerKananOffsetY || 0);
                        ctx.drawImage(footerKananImg, x, y, w, footerH * scale);
                    }
                }
            };

            // 3. Restart live video from beginning
            videoEl.muted = true;
            videoEl.currentTime = 0;
            try { await videoEl.play(); } catch (e) { console.warn('[handleRecordVideo] play err:', e); }

            const stream = recordCanvas.captureStream(30);
            const videoTrack = stream.getVideoTracks()[0];

            // 4. Codec detection for MP4 / WebM
            let mimeType = 'video/mp4';
            if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
                mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
            } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
                mimeType = 'video/mp4;codecs=avc1';
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                mimeType = 'video/webm;codecs=h264';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                mimeType = 'video/webm;codecs=vp9';
            } else {
                mimeType = 'video/webm';
            }

            const totalDurationSec = 20;
            const totalDurationMs = totalDurationSec * 1000;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 15000000
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            const startTime = Date.now();

            mediaRecorder.onstop = async () => {
                if (recordCanvas && document.body.contains(recordCanvas)) {
                    document.body.removeChild(recordCanvas);
                }
                const finalMime = mimeType.includes('mp4') ? 'video/mp4' : mimeType;
                let videoBlob = new Blob(chunks, { type: finalMime });

                try {
                    videoBlob = await fixWebmDuration(videoBlob, totalDurationMs);
                } catch (e) { console.warn('[handleRecordVideo] duration patch:', e); }

                const videoUrl = URL.createObjectURL(videoBlob);
                const filename = `story-video-executive-${selectedDay.toLowerCase()}.mp4`;

                try { await downloadVideoFile(videoBlob, filename); } catch (e) { console.warn(e); }

                setResult({ videoUrl, videoBlob, filename, isVideo: true });
                setIsRecordingVideo(false);
                setRecordingProgress(100);
            };

            mediaRecorder.start(100);

            // 5. Recording loop
            const renderFrame = () => {
                const elapsed = Date.now() - startTime;
                setRecordingProgress(Math.min(100, Math.round((elapsed / totalDurationMs) * 100)));

                drawFrame();

                if (videoTrack?.requestFrame) videoTrack.requestFrame();

                if (elapsed < totalDurationMs) {
                    requestAnimationFrame(renderFrame);
                } else {
                    if (mediaRecorder.state === 'recording') mediaRecorder.stop();
                }
            };

            renderFrame();

        } catch (err) {
            console.error('[ExecutiveDailyStory] Video recording error:', err);
            setDisableAnimForSnapshot(false);
            if (recordCanvas && document.body.contains(recordCanvas)) {
                document.body.removeChild(recordCanvas);
            }
            alert('Gagal membuat video story: ' + err.message);
            setIsRecordingVideo(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-200 select-none">
            {/* Top Workspace Action Toolbar */}
            <div className="h-12 sm:h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-20 shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 hidden xs:inline">
                        Format:
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg truncate">
                        📱 9:16 Story (1080×1920)
                    </span>
                    <span className="text-[11px] sm:text-xs font-black text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg hidden sm:inline">
                        {config.customDayBadge || selectedDay} • {activeDoctors.length} Dokter
                    </span>
                </div>

                {/* Export Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Replay Animation Button */}
                    <button
                        onClick={replayAnimation}
                        className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-xs sm:text-sm border border-purple-200 active:scale-95 transition-all"
                        title="Putar ulang animasi masuk"
                    >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden md:inline">Replay Animasi</span>
                    </button>

                    {/* MP4 Video Export Button */}
                    <button
                        onClick={handleRecordVideo}
                        disabled={isRecordingVideo || isGeneratingPng}
                        className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-indigo-500/30"
                        title="Ekspor sebagai Video Animasi MP4 (1080×1920 Portrait)"
                    >
                        {isRecordingVideo ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                <span>Merekam MP4 ({recordingProgress}%)</span>
                            </>
                        ) : (
                            <>
                                <VideoIcon className="w-3.5 h-3.5 text-amber-400" />
                                <span className="hidden sm:inline">Download Video MP4</span>
                                <span className="sm:hidden">MP4</span>
                            </>
                        )}
                    </button>

                    {/* PNG Export Button */}
                    <button
                        onClick={handleGeneratePng}
                        disabled={isGeneratingPng || isRecordingVideo}
                        className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isGeneratingPng ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                <span>Memproses PNG...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Download PNG</span>
                                <span className="sm:hidden">PNG</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Interactive Pan/Zoom Canvas Area */}
            <div
                ref={containerRef}
                className={`flex-1 w-full h-full relative overflow-hidden touch-none ${
                    isPanning ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
            >
                <div
                    ref={contentRef}
                    style={{
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        transformOrigin: 'top left',
                        position: 'absolute'
                    }}
                >
                    <ExecutiveDailyStoryCanvas
                        canvasRef={canvasRef}
                        videoElementRef={videoElementRef}
                        disableAnimations={disableAnimForSnapshot}
                    />
                </div>
            </div>

            {/* Zoom Controls Overlay */}
            <ZoomControls
                onZoomIn={() => {
                    if (!containerRef.current) return;
                    const rect = containerRef.current.getBoundingClientRect();
                    zoomPoint(1.2, rect.width / 2, rect.height / 2);
                }}
                onZoomOut={() => {
                    if (!containerRef.current) return;
                    const rect = containerRef.current.getBoundingClientRect();
                    zoomPoint(0.8, rect.width / 2, rect.height / 2);
                }}
                onFit={fitToScreen}
            />

            {/* Success Download / Share Modal with Video & PNG Player */}
            <SuccessModal
                isOpen={Boolean(result)}
                onClose={() => setResult(null)}
                imageUrl={result?.url}
                imageBlob={result?.blob}
                videoUrl={result?.videoUrl}
                videoBlob={result?.videoBlob}
                filename={result?.filename}
            />
        </div>
    );
};
