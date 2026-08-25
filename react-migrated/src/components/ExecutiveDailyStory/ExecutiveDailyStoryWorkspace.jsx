import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useExecutiveDailyStory } from '../../context/ExecutiveDailyStoryContext';
import { ExecutiveDailyStoryCanvas } from './ExecutiveDailyStoryCanvas';
import { ZoomControls } from '../Preview/ZoomControls';
import { SuccessModal } from '../UI/SuccessModal';
import { downloadPngFile } from '../../utils/downloadHelper';
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

    // ========================================================
    // Video Story Generator via Canvas MediaRecorder (MP4 Format)
    // ========================================================
    const handleRecordVideo = async () => {
        const targetEl = document.getElementById('executive-daily-story-canvas');
        const contentEl = contentRef.current;
        const videoEl = videoElementRef.current;

        if (!targetEl || !videoEl) {
            alert('Elemen video belum siap.');
            return;
        }

        setIsRecordingVideo(true);
        setRecordingProgress(0);

        try {
            // Save transform & unscale for high-res recording
            const savedTransform = contentEl.style.transform;
            contentEl.style.transition = 'none';
            contentEl.style.transform = 'none';
            await new Promise((r) => requestAnimationFrame(r));

            // Generate an overlay image of the DOM without the video background
            const overlayCanvas = await html2canvas(targetEl, {
                scale: 1,
                width: 1080,
                height: 1920,
                useCORS: true,
                allowTaint: false,
                backgroundColor: null,
                logging: false,
                ignoreElements: (element) => element.tagName === 'VIDEO'
            });

            // Restore interactive preview
            contentEl.style.transform = savedTransform;

            // Setup composite recording canvas
            const recordCanvas = document.createElement('canvas');
            recordCanvas.width = 1080;
            recordCanvas.height = 1920;
            const ctx = recordCanvas.getContext('2d');

            const stream = recordCanvas.captureStream(30);

            // Determine best supported MP4 / WebM codec
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

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 10000000 // 10 Mbps High Quality
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            const durationMs = 5000; // 5 Seconds Story Duration
            const startTime = Date.now();

            mediaRecorder.onstop = () => {
                const videoBlob = new Blob(chunks, { type: 'video/mp4' });
                const videoUrl = URL.createObjectURL(videoBlob);
                const filename = `story-video-executive-${selectedDay.toLowerCase()}.mp4`;

                // Automatically trigger MP4 download
                const a = document.createElement('a');
                a.href = videoUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // Show preview success modal
                setResult({
                    videoUrl,
                    videoBlob,
                    filename,
                    isVideo: true
                });

                setIsRecordingVideo(false);
                setRecordingProgress(100);
            };

            mediaRecorder.start();

            // Restart video loop for fresh recording start
            if (videoEl) {
                videoEl.currentTime = 0;
                videoEl.play().catch(() => {});
            }

            // High-fps render loop: video background + overlay elements
            const renderFrame = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(100, Math.round((elapsed / durationMs) * 100));
                setRecordingProgress(progress);

                if (videoEl && videoEl.readyState >= 2) {
                    ctx.drawImage(videoEl, 0, 0, 1080, 1920);
                }
                ctx.drawImage(overlayCanvas, 0, 0, 1080, 1920);

                if (elapsed < durationMs) {
                    requestAnimationFrame(renderFrame);
                } else {
                    mediaRecorder.stop();
                }
            };

            renderFrame();

        } catch (err) {
            console.error('[ExecutiveDailyStory] Video recording error:', err);
            alert('Gagal merekam video story MP4: ' + err.message);
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
