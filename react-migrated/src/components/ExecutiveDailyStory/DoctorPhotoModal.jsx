import React, { useState, useRef, useEffect } from 'react';
import {
    X,
    ZoomIn,
    ZoomOut,
    RotateCw,
    FlipHorizontal,
    Move,
    Upload,
    RotateCcw,
    Check,
    Image as ImageIcon
} from 'lucide-react';
import { getDoctorInitials } from '../../utils/imageHelper';

export const DoctorPhotoModal = ({ isOpen, onClose, doctor, onUpdate, onApplyToAll }) => {
    if (!isOpen || !doctor) return null;

    const [scale, setScale] = useState(doctor.photoScale !== undefined ? doctor.photoScale : 0.75);
    const [offsetX, setOffsetX] = useState(doctor.photoOffsetX !== undefined ? doctor.photoOffsetX : 0);
    const [offsetY, setOffsetY] = useState(doctor.photoOffsetY !== undefined ? doctor.photoOffsetY : 3);
    const [rotate, setRotate] = useState(doctor.photoRotate !== undefined ? doctor.photoRotate : 0);
    const [flipX, setFlipX] = useState(Boolean(doctor.photoFlipX));
    const [avatarUrl, setAvatarUrl] = useState(doctor.avatar || '');

    const fileInputRef = useRef(null);
    const previewCircleRef = useRef(null);
    const isDragging = useRef(false);
    const startDrag = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

    // Sync on doctor change
    useEffect(() => {
        if (doctor) {
            setScale(doctor.photoScale !== undefined ? doctor.photoScale : 0.75);
            setOffsetX(doctor.photoOffsetX !== undefined ? doctor.photoOffsetX : 0);
            setOffsetY(doctor.photoOffsetY !== undefined ? doctor.photoOffsetY : 3);
            setRotate(doctor.photoRotate !== undefined ? doctor.photoRotate : 0);
            setFlipX(Boolean(doctor.photoFlipX));
            setAvatarUrl(doctor.avatar || '');
        }
    }, [doctor]);

    // Live update parent context
    const emitChange = (newScale, newX, newY, newRot, newFlip, newAvatar) => {
        onUpdate(doctor.id, {
            photoScale: newScale !== undefined ? newScale : scale,
            photoOffsetX: newX !== undefined ? newX : offsetX,
            photoOffsetY: newY !== undefined ? newY : offsetY,
            photoRotate: newRot !== undefined ? newRot : rotate,
            photoFlipX: newFlip !== undefined ? newFlip : flipX,
            avatar: newAvatar !== undefined ? newAvatar : avatarUrl
        });
    };

    // Drag handlers on circular frame
    const handleMouseDown = (e) => {
        isDragging.current = true;
        startDrag.current = {
            x: e.clientX,
            y: e.clientY,
            initialX: offsetX,
            initialY: offsetY
        };
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current || !previewCircleRef.current) return;
        const rect = previewCircleRef.current.getBoundingClientRect();
        const circleSize = rect.width || 224;

        const deltaPixelX = e.clientX - startDrag.current.x;
        const deltaPixelY = e.clientY - startDrag.current.y;

        const deltaPercentX = (deltaPixelX / circleSize) * 100;
        const deltaPercentY = (deltaPixelY / circleSize) * 100;

        const nextX = Math.round(startDrag.current.initialX + deltaPercentX);
        const nextY = Math.round(startDrag.current.initialY + deltaPercentY);

        setOffsetX(nextX);
        setOffsetY(nextY);
        emitChange(scale, nextX, nextY, rotate, flipX, avatarUrl);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    // Touch support for drag
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            isDragging.current = true;
            startDrag.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                initialX: offsetX,
                initialY: offsetY
            };
        }
    };

    const handleTouchMove = (e) => {
        if (!isDragging.current || e.touches.length !== 1 || !previewCircleRef.current) return;
        const rect = previewCircleRef.current.getBoundingClientRect();
        const circleSize = rect.width || 224;

        const deltaPixelX = e.touches[0].clientX - startDrag.current.x;
        const deltaPixelY = e.touches[0].clientY - startDrag.current.y;

        const deltaPercentX = (deltaPixelX / circleSize) * 100;
        const deltaPercentY = (deltaPixelY / circleSize) * 100;

        const nextX = Math.round(startDrag.current.initialX + deltaPercentX);
        const nextY = Math.round(startDrag.current.initialY + deltaPercentY);

        setOffsetX(nextX);
        setOffsetY(nextY);
        emitChange(scale, nextX, nextY, rotate, flipX, avatarUrl);
    };

    // Handle Local File Upload
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEvt) => {
            const dataUrl = loadEvt.target.result;
            setAvatarUrl(dataUrl);
            emitChange(scale, offsetX, offsetY, rotate, flipX, dataUrl);
        };
        reader.readAsDataURL(file);
    };

    // Reset to ideal bust portrait framing (Zoom 75%, Y 3%)
    const handleReset = () => {
        setScale(0.75);
        setOffsetX(0);
        setOffsetY(3);
        setRotate(0);
        setFlipX(false);
        emitChange(0.75, 0, 3, 0, false, avatarUrl);
    };

    const handleApplyAllClick = () => {
        if (onApplyToAll) {
            onApplyToAll({
                photoScale: scale,
                photoOffsetX: offsetX,
                photoOffsetY: offsetY,
                photoRotate: rotate,
                photoFlipX: flipX
            });
        }
    };

    const flipTransform = flipX ? 'scaleX(-1)' : 'scaleX(1)';

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-amber-400" />
                        <div>
                            <h3 className="text-sm font-extrabold leading-tight">Atur Posisi & Ukuran Foto Dokter</h3>
                            <p className="text-[11px] text-blue-200 truncate max-w-xs">{doctor.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1 select-none">
                    {/* Interactive Frame Box */}
                    <div className="flex flex-col items-center">
                        <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1">
                            <Move className="w-3.5 h-3.5 text-blue-600" />
                            <span>Klik & geser foto di dalam lingkaran untuk memposisikan:</span>
                        </div>

                        {/* Circular Avatar Preview Box */}
                        <div
                            ref={previewCircleRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleMouseUp}
                            className="w-56 h-56 rounded-full border-4 border-[#001f5c] overflow-hidden relative cursor-grab active:cursor-grabbing bg-slate-100 shadow-xl flex items-center justify-center"
                        >
                            {/* Doctor Full Aspect Ratio Image */}
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={doctor.name}
                                    crossOrigin="anonymous"
                                    className="pointer-events-none select-none"
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
                                        transform: `translate(calc(-50% + ${offsetX}%), calc(-50% + ${offsetY}%)) scale(${scale}) rotate(${rotate}deg) ${flipTransform}`,
                                        transformOrigin: 'center center',
                                        transition: isDragging.current ? 'none' : 'transform 0.05s ease-out'
                                    }}
                                />
                            ) : (
                                <div className="text-3xl font-black text-slate-400">
                                    {getDoctorInitials(doctor.name)}
                                </div>
                            )}

                            {/* Centering Crosshair Overlay */}
                            <div className="absolute inset-0 pointer-events-none border border-blue-500/20 rounded-full flex items-center justify-center">
                                <div className="w-full h-[1px] bg-blue-500/20" />
                                <div className="h-full w-[1px] bg-blue-500/20 absolute" />
                                <div className="w-12 h-12 rounded-full border border-dashed border-blue-500/40 absolute" />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2.5">
                            <span>Geser X: <strong className="text-blue-900 font-extrabold">{offsetX}%</strong></span>
                            <span>Geser Y: <strong className="text-blue-900 font-extrabold">{offsetY}%</strong></span>
                            <span>Zoom: <strong className="text-blue-900 font-extrabold">{Math.round(scale * 100)}%</strong></span>
                        </div>
                    </div>

                    {/* Sliders & Controls */}
                    <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                        {/* 1. Zoom / Scale */}
                        <div>
                            <div className="flex items-center justify-between text-slate-700 font-bold mb-1">
                                <span className="flex items-center gap-1.5">
                                    <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Zoom / Skala Foto</span>
                                </span>
                                <span className="text-blue-800 font-extrabold">{Math.round(scale * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const s = Math.max(0.5, +(scale - 0.1).toFixed(2));
                                        setScale(s);
                                        emitChange(s, offsetX, offsetY, rotate, flipX, avatarUrl);
                                    }}
                                    className="p-1.5 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-100"
                                >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                </button>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3.5"
                                    step="0.05"
                                    value={scale}
                                    onChange={(e) => {
                                        const s = parseFloat(e.target.value);
                                        setScale(s);
                                        emitChange(s, offsetX, offsetY, rotate, flipX, avatarUrl);
                                    }}
                                    className="flex-1 accent-blue-600"
                                />
                                <button
                                    onClick={() => {
                                        const s = Math.min(3.5, +(scale + 0.1).toFixed(2));
                                        setScale(s);
                                        emitChange(s, offsetX, offsetY, rotate, flipX, avatarUrl);
                                    }}
                                    className="p-1.5 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-100"
                                >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* 2. Position Sliders */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="flex justify-between text-slate-700 font-bold mb-1">
                                    <span>Geser Horizontal (X):</span>
                                    <span className="text-blue-800">{offsetX}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="-100"
                                    max="100"
                                    value={offsetX}
                                    onChange={(e) => {
                                        const x = parseInt(e.target.value);
                                        setOffsetX(x);
                                        emitChange(scale, x, offsetY, rotate, flipX, avatarUrl);
                                    }}
                                    className="w-full accent-blue-600"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-slate-700 font-bold mb-1">
                                    <span>Geser Vertikal (Y):</span>
                                    <span className="text-blue-800">{offsetY}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="-100"
                                    max="100"
                                    value={offsetY}
                                    onChange={(e) => {
                                        const y = parseInt(e.target.value);
                                        setOffsetY(y);
                                        emitChange(scale, offsetX, y, rotate, flipX, avatarUrl);
                                    }}
                                    className="w-full accent-blue-600"
                                />
                            </div>
                        </div>

                        {/* 3. Rotate & Flip */}
                        <div className="grid grid-cols-2 gap-3 items-center pt-1">
                            <div>
                                <div className="flex justify-between text-slate-700 font-bold mb-1">
                                    <span className="flex items-center gap-1">
                                        <RotateCw className="w-3 h-3 text-slate-500" />
                                        <span>Rotasi / Kemiringan:</span>
                                    </span>
                                    <span className="text-blue-800">{rotate}°</span>
                                </div>
                                <input
                                    type="range"
                                    min="-180"
                                    max="180"
                                    value={rotate}
                                    onChange={(e) => {
                                        const r = parseInt(e.target.value);
                                        setRotate(r);
                                        emitChange(scale, offsetX, offsetY, r, flipX, avatarUrl);
                                    }}
                                    className="w-full accent-blue-600"
                                />
                            </div>

                            <div className="flex items-center justify-center pt-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = !flipX;
                                        setFlipX(next);
                                        emitChange(scale, offsetX, offsetY, rotate, next, avatarUrl);
                                    }}
                                    className={`w-full py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 border transition-all ${
                                        flipX
                                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                    }`}
                                >
                                    <FlipHorizontal className="w-4 h-4" />
                                    <span>Cermin (Flip)</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 4. Upload & Change Avatar */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                        <span className="font-extrabold text-slate-700 block">Ganti Foto Dokter:</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors shadow-xs"
                            >
                                <Upload className="w-3.5 h-3.5 text-blue-600" />
                                <span>Upload Foto Baru dari Laptop</span>
                            </button>
                        </div>
                        <div>
                            <input
                                type="text"
                                value={avatarUrl}
                                onChange={(e) => {
                                    setAvatarUrl(e.target.value);
                                    emitChange(scale, offsetX, offsetY, rotate, flipX, e.target.value);
                                }}
                                placeholder="Atau tempel link URL foto: https://..."
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-[11px] focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Kembalikan ke posisi ideal standar (Zoom 75%, Y 3%)"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Posisi Standar (75%)</span>
                        </button>

                        {onApplyToAll && (
                            <button
                                onClick={handleApplyAllClick}
                                className="px-3 py-2 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                                title="Terapkan pengaturan zoom & posisi ini ke semua dokter di jadwal"
                            >
                                <span>Terapkan ke Semua</span>
                            </button>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                    >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Selesai</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
