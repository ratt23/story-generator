import { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useExecutiveStory } from '../../context/ExecutiveStoryContext';
import { ExecutiveStoryCanvas } from './ExecutiveStoryCanvas';
import { ZoomControls } from '../Preview/ZoomControls';
import { SuccessModal } from '../UI/SuccessModal';
import { createDoctorSlug } from '../../utils/imageHelper';
import { downloadPngFile } from '../../utils/downloadHelper';
import { Download, Loader2, Sparkles } from 'lucide-react';

export const ExecutiveStoryWorkspace = () => {
    const { selectedDoctor, config } = useExecutiveStory();
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const canvasRef = useRef(null);

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
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState(null);

    const isSquare = config.format === 'square';
    const canvasWidth = 1080;
    const canvasHeight = isSquare ? 1080 : 1920;

    // Calculate Fit to Screen for interactive preview
    const fitToScreen = useCallback(() => {
        if (!containerRef.current) return;
        const container = containerRef.current.getBoundingClientRect();

        const targetW = 1080;
        const targetH = config.format === 'square' ? 1080 : 1920;

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
    }, [config.format]);

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

    // ========================================================
    // Mouse Event Handlers (Desktop Pan & Wheel Zoom)
    // ========================================================
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

    // ========================================================
    // Touch Event Handlers (Mobile 1-Finger Pan & 2-Finger Pinch)
    // ========================================================
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
    // PNG Generator via html2canvas (Zero-Distortion Full-Bleed)
    // ========================================================
    const handleGeneratePng = async () => {
        if (!selectedDoctor) {
            alert('Silakan pilih dokter terlebih dahulu.');
            return;
        }

        const targetEl = document.getElementById('executive-story-preview');
        const contentEl = contentRef.current;

        if (!targetEl || !contentEl) {
            alert('Kanvas tidak ditemukan.');
            return;
        }

        setIsGenerating(true);
        try {
            if (document.fonts) {
                await document.fonts.ready;
            }

            // Save current interactive transform
            const savedTransform = contentEl.style.transform;
            const savedTransition = contentEl.style.transition;

            // Temporarily unscale the live preview element to native 1080x1920
            contentEl.style.transition = 'none';
            contentEl.style.transform = 'none';

            // Wait 1 frame for CSS repaint
            await new Promise((r) => requestAnimationFrame(r));

            // High-resolution html2canvas capture on natural 1:1 element
            const canvas = await html2canvas(targetEl, {
                scale: 2, // 2x scale: exactly 2160x3840 (Story) or 2160x2160 (Square)
                width: canvasWidth,
                height: canvasHeight,
                useCORS: true,
                allowTaint: false,
                backgroundColor: null,
                logging: false,
                imageTimeout: 20000
            });

            // Restore interactive preview transform
            contentEl.style.transform = savedTransform;
            contentEl.style.transition = savedTransition;

            // Convert canvas directly to PNG Blob
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    setIsGenerating(false);
                    alert('Gagal menghasilkan file gambar PNG.');
                    return;
                }

                const docSlug = createDoctorSlug(config.customDoctorName || selectedDoctor.name);
                const filename = `jadwal-executive-${docSlug || 'dokter'}.png`;
                const blobUrl = URL.createObjectURL(blob);

                setResult({
                    blob,
                    url: blobUrl,
                    filename
                });

                // Trigger direct file download with guaranteed .png filename using file-saver
                try {
                    await downloadPngFile(blob, filename);
                } catch (downloadErr) {
                    console.warn('[ExecutiveStoryWorkspace] Download triggered fallback:', downloadErr);
                }

                setIsGenerating(false);
            }, 'image/png');

        } catch (err) {
            console.error('[ExecutiveStoryWorkspace] Generate error:', err);
            if (contentRef.current) {
                contentRef.current.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
            }
            alert(`Gagal membuat gambar: ${err.message || 'Pastikan foto dokter dapat dimuat.'}`);
            setIsGenerating(false);
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
                    <span className="text-[11px] sm:text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg truncate max-w-[130px] sm:max-w-none">
                        {config.format === 'square' ? '1:1 Square' : '📱 9:16 Story'}
                    </span>
                </div>

                {/* Generate PNG CTA Button */}
                <button
                    onClick={handleGeneratePng}
                    disabled={isGenerating || !selectedDoctor}
                    className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                            <span>Memproses PNG...</span>
                        </>
                    ) : (
                        <>
                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Generate & Download PNG</span>
                            <span className="sm:hidden">Download PNG</span>
                        </>
                    )}
                </button>
            </div>

            {/* Interactive Pan/Zoom Canvas Area (For Live User Preview) */}
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
                    <ExecutiveStoryCanvas canvasRef={canvasRef} />
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

            {/* Success Download / Share Modal */}
            <SuccessModal
                isOpen={Boolean(result)}
                onClose={() => setResult(null)}
                imageUrl={result?.url}
                imageBlob={result?.blob}
                filename={result?.filename}
            />
        </div>
    );
};
