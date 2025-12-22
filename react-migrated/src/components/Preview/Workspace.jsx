import { useState, useRef, useEffect } from 'react';
import { Canvas } from './Canvas';
import { ZoomControls } from './ZoomControls';
import { useStory } from '../../context/StoryContext';

export const Workspace = () => {
    const { config } = useStory();
    const containerRef = useRef(null);
    const contentRef = useRef(null);

    // Pan/Zoom State
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.2 });
    const [isPanning, setIsPanning] = useState(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    // Fit to Screen Logic
    const fitToScreen = () => {
        if (!containerRef.current || !contentRef.current) return;
        const container = containerRef.current.getBoundingClientRect();

        // Target Dims
        const targetWidth = 1080;
        const targetHeight = config.format === 'square' ? 1080 : 1920;

        // Fallback dimensions for container if hidden/zero
        const cWidth = container.width || window.innerWidth;
        const cHeight = container.height || (window.innerHeight - 64);

        const isLandscapeMobile = window.matchMedia("(orientation: landscape) and (max-height: 600px)").matches;
        const padding = isLandscapeMobile ? 10 : 20;

        const scaleX = (cWidth - padding * 2) / targetWidth;
        const scaleY = (cHeight - padding * 2) / targetHeight;
        const newScale = Math.min(scaleX, scaleY) * 0.95;

        // Center it
        const x = (cWidth - (targetWidth * newScale)) / 2;
        const y = (cHeight - (targetHeight * newScale)) / 2;

        setTransform({ x, y, scale: newScale });
    };

    // Initial Fit
    useEffect(() => {
        // Short delay to ensure layout
        const timer = setTimeout(fitToScreen, 100);
        window.addEventListener('resize', fitToScreen);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', fitToScreen);
        };
    }, [config.format]); // Re-fit when format changes

    // Zoom Helper
    const zoomPoint = (factor, centerX, centerY) => {
        setTransform(prev => {
            let newScale = prev.scale * factor;
            if (newScale < 0.05) newScale = 0.05;
            if (newScale > 5) newScale = 5;

            // Calculate relative position of mouse to the content's current top-left
            // xs, ys is the position relative to the content unscaled
            // We want the point under the mouse to stay under the mouse.

            // Formula: newPos = mousePos - (mousePos - oldPos) * (newScale / oldScale)
            // Or simpler: translate so that point under mouse remains same

            // Vector from current Origin (x,y) to mouse
            const vX = centerX - prev.x;
            const vY = centerY - prev.y;

            // Allow the origin to move such that:
            // newX + (vX / prevScale) * newScale == centerX
            // no...

            const xs = (centerX - prev.x) / prev.scale;
            const ys = (centerY - prev.y) / prev.scale;

            return {
                x: centerX - xs * newScale,
                y: centerY - ys * newScale,
                scale: newScale
            };
        });
    };

    // Event Handlers
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY;
        const factor = delta > 0 ? 0.9 : 1.1;

        // Rect for relative validation
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        zoomPoint(factor, mouseX, mouseY);
    };

    const handleMouseDown = (e) => {
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

    return (
        <div className="w-full h-full relative overflow-hidden bg-slate-200 select-none">
            <div
                ref={containerRef}
                className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            // Touch events would go here...
            >
                <div
                    ref={contentRef}
                    style={{
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        transformOrigin: 'top left',
                        position: 'absolute'
                    }}
                >
                    <Canvas />
                </div>
            </div>

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
        </div>
    );
};
