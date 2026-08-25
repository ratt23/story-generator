import React, { useState } from 'react';
import { useExecutiveDailyStory } from '../../context/ExecutiveDailyStoryContext';
import { DoctorPhotoModal } from './DoctorPhotoModal';
import {
    Calendar,
    Users,
    Sliders,
    Video,
    Plus,
    RotateCcw,
    ChevronUp,
    ChevronDown,
    Trash2,
    Edit2,
    Check,
    Search,
    Crop,
    Type,
    Layout,
    Layers,
    Sparkles,
    Play,
    ArrowUp,
    ArrowDown,
    ArrowRight,
    ArrowLeft,
    Eye,
    Zap,
    Maximize2,
    Camera,
    Image as ImageIcon
} from 'lucide-react';

// Canva-style Animation Option Card Component
const AnimationOptionCard = ({ label, icon: Icon, isSelected, onClick, description }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-center transition-all ${
            isSelected
                ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-md scale-[1.02]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
    >
        <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center mb-1.5 transition-colors ${
                isSelected ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
            }`}
        >
            <Icon className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-extrabold leading-tight">{label}</span>
        {description && <span className="text-[9px] text-slate-400 mt-0.5">{description}</span>}
    </button>
);

const NumberSliderField = ({
    label,
    value,
    min,
    max,
    step = 1,
    unit = 'px',
    onChange,
    isPercentage = false,
    className = ''
}) => {
    const displayVal = isPercentage ? Math.round((value ?? 0) * 100) : (value ?? 0);

    const handleNumberChange = (e) => {
        const raw = parseFloat(e.target.value);
        if (isNaN(raw)) return;
        if (isPercentage) {
            onChange(Number((raw / 100).toFixed(2)));
        } else {
            onChange(raw);
        }
    };

    return (
        <div className={`space-y-1 ${className}`}>
            <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium truncate pr-1">{label}</span>
                <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-blue-400 transition-all shrink-0">
                    <input
                        type="number"
                        min={isPercentage ? min * 100 : min}
                        max={isPercentage ? max * 100 : max}
                        step={isPercentage ? (step * 100) : step}
                        value={displayVal}
                        onChange={handleNumberChange}
                        className="w-12 text-right bg-transparent text-[11px] font-bold text-blue-700 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value ?? 0}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg block"
            />
        </div>
    );
};

export const ExecutiveDailyStoryControls = () => {
    const {
        selectedDay,
        setSelectedDay,
        daysList,
        dailyDoctors,
        activeDoctors,
        allExecutiveDoctorsList,
        updateMasterDoctorPhoto,
        toggleDoctor,
        updateDoctor,
        updateDoctorBatch,
        moveDoctor,
        addCustomDoctor,
        removeDoctor,
        resetToApiSchedule,
        applyFaceCenteringToAll,
        clearSavedPhotoSettings,
        hasManualEdits,
        config,
        updateConfig,
        resetConfig,
        replayAnimation
    } = useExecutiveDailyStory();

    const [activeTab, setActiveTab] = useState('doctors'); // 'doctors' | 'photos' | 'design' | 'animate' | 'video'
    const [searchTerm, setSearchTerm] = useState('');
    const [photoSearchTerm, setPhotoSearchTerm] = useState('');
    const [editingDocId, setEditingDocId] = useState(null);
    const [photoModalDoc, setPhotoModalDoc] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state for adding custom doctor
    const [newDocForm, setNewDocForm] = useState({
        name: '',
        specialty: '',
        time: '14:00–17:00'
    });

    const filteredDoctors = dailyDoctors.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPhotoDoctors = (allExecutiveDoctorsList || []).filter(d =>
        d.name.toLowerCase().includes(photoSearchTerm.toLowerCase()) ||
        d.specialty.toLowerCase().includes(photoSearchTerm.toLowerCase())
    );

    const handleAddDoctorSubmit = (e) => {
        e.preventDefault();
        if (!newDocForm.name.trim()) return;
        addCustomDoctor({
            name: newDocForm.name.trim(),
            specialty: newDocForm.specialty.trim() || 'Spesialis',
            time: newDocForm.time.trim() || '14:00–17:00'
        });
        setNewDocForm({ name: '', specialty: '', time: '14:00–17:00' });
        setShowAddModal(false);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 text-slate-800 select-none">
            {/* Top Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10 shrink-0">
                <button
                    onClick={() => setActiveTab('doctors')}
                    className={`flex-1 py-2.5 px-1 flex items-center justify-center gap-1 text-[11px] font-bold transition-all border-b-2 ${
                        activeTab === 'doctors'
                            ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Users className="w-3.5 h-3.5" />
                    <span>Jadwal</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] px-1 py-0.2 rounded-full font-extrabold">
                        {activeDoctors.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('photos')}
                    className={`flex-1 py-2.5 px-1 flex items-center justify-center gap-1 text-[11px] font-bold transition-all border-b-2 ${
                        activeTab === 'photos'
                            ? 'border-amber-600 text-amber-700 bg-amber-50/50'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                    title="Menu Master Foto Dokter (Berlaku untuk semua hari)"
                >
                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                    <span>Foto Master</span>
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1 rounded uppercase">
                        ALL
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('animate')}
                    className={`flex-1 py-2.5 px-1 flex items-center justify-center gap-1 text-[11px] font-bold transition-all border-b-2 ${
                        activeTab === 'animate'
                            ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Zap className="w-3.5 h-3.5 text-purple-600" />
                    <span>Animasi</span>
                </button>

                <button
                    onClick={() => setActiveTab('design')}
                    className={`flex-1 py-2.5 px-1 flex items-center justify-center gap-1 text-[11px] font-bold transition-all border-b-2 ${
                        activeTab === 'design'
                            ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Layout</span>
                </button>

                <button
                    onClick={() => setActiveTab('video')}
                    className={`flex-1 py-2.5 px-1 flex items-center justify-center gap-1 text-[11px] font-bold transition-all border-b-2 ${
                        activeTab === 'video'
                            ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video</span>
                </button>
            </div>

            {/* TAB 1: DOCTORS & SCHEDULE */}
            {activeTab === 'doctors' && (
                <div className="p-3.5 space-y-4">
                    {/* Day Selection Bar */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                <span>Pilih Hari Praktik:</span>
                            </span>
                            {hasManualEdits && (
                                <button
                                    onClick={resetToApiSchedule}
                                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline"
                                    title="Kembalikan daftar dokter ke jadwal default API"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reset API</span>
                                </button>
                            )}
                        </div>

                        {/* Days Grid Buttons */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                            {daysList.map((day) => {
                                const isSelected = selectedDay === day;
                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`py-1.5 px-2 rounded-lg text-xs font-extrabold transition-all text-center ${
                                            isSelected
                                                ? 'bg-[#001f5c] text-white shadow-md shadow-blue-900/20 scale-[1.02]'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Search and Add Doctor Action */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cari nama atau spesialis..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                            />
                        </div>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0"
                            title="Tambah Dokter Kustom"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah</span>
                        </button>
                    </div>

                    {/* Active Doctors Counter Banner & Quick Face Focus Action */}
                    <div className="flex items-center justify-between text-xs px-1 text-slate-500 font-medium">
                        <span>Dokter Ditampilkan: <strong className="text-blue-900">{activeDoctors.length}</strong></span>
                        <button
                            type="button"
                            onClick={applyFaceCenteringToAll}
                            className="text-[10px] font-extrabold px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md flex items-center gap-1 transition-colors"
                            title="Otomatis sesuaikan posisi semua foto dokter agar fokus ke wajah"
                        >
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>Fokus Wajah Semua</span>
                        </button>
                    </div>

                    {/* Doctors List */}
                    <div className="space-y-2">
                        {filteredDoctors.map((doc, idx) => {
                            const isEditing = editingDocId === doc.id;
                            const isFirst = idx === 0;
                            const isLast = idx === filteredDoctors.length - 1;

                            return (
                                <div
                                    key={doc.id}
                                    className={`p-2.5 rounded-xl border transition-all ${
                                        doc.enabled
                                            ? 'bg-white border-slate-200 shadow-xs'
                                            : 'bg-slate-100/80 border-dashed border-slate-300 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {/* Toggle Active Checkbox */}
                                        <button
                                            onClick={() => toggleDoctor(doc.id)}
                                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                                                doc.enabled
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'border border-slate-300 bg-white text-transparent hover:border-slate-400'
                                            }`}
                                            title={doc.enabled ? 'Sembunyikan dari story' : 'Tampilkan di story'}
                                        >
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        </button>

                                        {/* Avatar Mini with direct click to edit photo */}
                                        <button
                                            onClick={() => setPhotoModalDoc(doc)}
                                            className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border-2 border-blue-900/40 hover:border-amber-500 shrink-0 flex items-center justify-center text-[10px] font-black text-slate-600 relative group cursor-pointer"
                                            title="Klik untuk atur posisi & zoom foto"
                                        >
                                            {doc.avatar ? (
                                                <img
                                                    src={doc.avatar}
                                                    alt={doc.name}
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
                                                        transform: `translate(calc(-50% + ${doc.photoOffsetX || 0}%), calc(-50% + ${doc.photoOffsetY || 0}%)) scale(${doc.photoScale || 1}) rotate(${doc.photoRotate || 0}deg) ${doc.photoFlipX ? 'scaleX(-1)' : 'scaleX(1)'}`,
                                                        transformOrigin: 'center center'
                                                    }}
                                                />
                                            ) : (
                                                <span>DR</span>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Crop className="w-3 h-3 text-white" />
                                            </div>
                                        </button>

                                        {/* Doctor Basic Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                                                {doc.name}
                                            </div>
                                            <div className="text-[11px] text-blue-900/80 font-medium truncate mt-0.5" title={doc.specialty}>
                                                {doc.specialty}
                                            </div>
                                        </div>

                                        {/* Schedule Time Input */}
                                        <div className="w-22 shrink-0">
                                            <input
                                                type="text"
                                                value={doc.time || ''}
                                                onChange={(e) => updateDoctor(doc.id, 'time', e.target.value)}
                                                placeholder="Jam Praktik"
                                                className="w-full text-center text-[11px] font-bold py-1 px-1 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button
                                                onClick={() => setPhotoModalDoc(doc)}
                                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Atur Posisi & Zoom Foto Dokter"
                                            >
                                                <Crop className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => moveDoctor(idx, -1)}
                                                disabled={isFirst}
                                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded"
                                                title="Pindah ke atas"
                                            >
                                                <ChevronUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => moveDoctor(idx, 1)}
                                                disabled={isLast}
                                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded"
                                                title="Pindah ke bawah"
                                            >
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setEditingDocId(isEditing ? null : doc.id)}
                                                className={`p-1 rounded ${
                                                    isEditing ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                                }`}
                                                title="Edit Teks Dokter & Spesialis"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => removeDoctor(doc.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Hapus Dokter"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Detail Editor */}
                                    {isEditing && (
                                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 grid grid-cols-1 gap-2.5 text-xs bg-slate-50/70 p-2.5 rounded-lg">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Nama Lengkap & Gelar:</label>
                                                <input
                                                    type="text"
                                                    value={doc.name}
                                                    onChange={(e) => updateDoctor(doc.id, 'name', e.target.value)}
                                                    className="w-full mt-0.5 p-1.5 text-xs bg-white border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                                        Spesialisasi / Subspesialis:
                                                    </label>
                                                    {/* Quick Helper Buttons */}
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                let s = (doc.specialty || '').replace(/^(dokter spesialis|spesialis)\s*/i, '');
                                                                updateDoctor(doc.id, 'specialty', `Dokter Spesialis ${s}`);
                                                            }}
                                                            className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded"
                                                            title="Tambah awalan 'Dokter Spesialis'"
                                                        >
                                                            + Dokter Spesialis
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                let s = (doc.specialty || '').replace(/^(dokter spesialis|spesialis)\s*/i, '');
                                                                updateDoctor(doc.id, 'specialty', `Spesialis ${s}`);
                                                            }}
                                                            className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded"
                                                            title="Tambah awalan 'Spesialis'"
                                                        >
                                                            + Spesialis
                                                        </button>
                                                    </div>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={doc.specialty}
                                                    onChange={(e) => updateDoctor(doc.id, 'specialty', e.target.value)}
                                                    placeholder="Contoh: Dokter Spesialis Penyakit Dalam"
                                                    className="w-full mt-1 p-1.5 text-xs bg-white border border-slate-300 rounded font-semibold text-blue-950 focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setPhotoModalDoc(doc)}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                                                >
                                                    <Crop className="w-3.5 h-3.5" />
                                                    <span>Atur Posisi & Zoom Foto Dokter</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingDocId(null)}
                                                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                                                >
                                                    Tutup
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 2: MASTER DOCTOR PHOTOS (GLOBAL PERMANENT FOR ALL DAYS) */}
            {activeTab === 'photos' && (
                <div className="p-3.5 space-y-4">
                    {/* Master Banner */}
                    <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-blue-500/10 border border-amber-200/80 p-3.5 rounded-2xl">
                        <div className="flex items-start gap-2.5">
                            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                                <Camera className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-extrabold text-slate-800">Master Posisi Foto Seluruh Dokter</h4>
                                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                    Atur zoom dan posisi foto di sini. Pengaturan ini <strong>tersimpan permanen</strong> dan <strong>otomatis berlaku untuk semua hari (Senin–Minggu)</strong>.
                                </p>
                            </div>
                        </div>

                        {/* Quick Master Global Actions */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-amber-200/60">
                            <button
                                type="button"
                                onClick={applyFaceCenteringToAll}
                                className="px-2.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                                title="Atur semua foto dokter ke preset standar yang pas (Zoom 75%, Y 3%)"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                                <span>Fokus Wajah Semua</span>
                            </button>

                            <button
                                type="button"
                                onClick={clearSavedPhotoSettings}
                                className="px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                title="Reset semua posisi foto tersimpan ke setelan awal"
                            >
                                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                                <span>Reset Default</span>
                            </button>
                        </div>
                    </div>

                    {/* Search Master Catalog */}
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={photoSearchTerm}
                            onChange={(e) => setPhotoSearchTerm(e.target.value)}
                            placeholder="Cari nama atau spesialis dokter..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                        />
                    </div>

                    {/* Master Doctors Photo Grid / List */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500">
                            <span>Total Dokter Master: <strong className="text-amber-800 font-black">{filteredPhotoDoctors.length}</strong></span>
                            <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>Tersimpan ke Semua Hari</span>
                            </span>
                        </div>

                        {filteredPhotoDoctors.map((doc) => (
                            <div
                                key={doc.id || doc.slug}
                                className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-amber-400 transition-all flex items-center gap-3"
                            >
                                {/* Circle Avatar with live custom transform */}
                                <div
                                    onClick={() => setPhotoModalDoc(doc)}
                                    className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 border-2 border-[#001f5c] shrink-0 relative flex items-center justify-center cursor-pointer group shadow-xs"
                                    title="Klik untuk atur posisi foto"
                                >
                                    {doc.avatar ? (
                                        <img
                                            src={doc.avatar}
                                            alt={doc.name}
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
                                                transform: `translate(calc(-50% + ${doc.photoOffsetX || 0}%), calc(-50% + ${doc.photoOffsetY || 0}%)) scale(${doc.photoScale || 0.75}) rotate(${doc.photoRotate || 0}deg) ${doc.photoFlipX ? 'scaleX(-1)' : 'scaleX(1)'}`,
                                                transformOrigin: 'center center'
                                            }}
                                        />
                                    ) : (
                                        <span className="text-xs font-black text-slate-500">DR</span>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Crop className="w-4 h-4 text-white" />
                                    </div>
                                </div>

                                {/* Doctor Info & Current Photo Stats */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                                        {doc.name}
                                    </div>
                                    <div className="text-[11px] text-blue-900/80 font-medium truncate mt-0.5">
                                        {doc.specialty}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-bold">
                                        <span className="bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded text-amber-900 font-black">
                                            Zoom: {Math.round((doc.photoScale || 0.75) * 100)}%
                                        </span>
                                        <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                            Y: {doc.photoOffsetY || 3}%
                                        </span>
                                        {doc.photoOffsetX !== 0 && (
                                            <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                                X: {doc.photoOffsetX}%
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => setPhotoModalDoc(doc)}
                                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all border border-amber-200 shadow-xs"
                                    title="Buka editor posisi foto dokter"
                                >
                                    <Crop className="w-3.5 h-3.5" />
                                    <span>Atur</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: ANIMATION CONTROLS (Canva Style) */}
            {activeTab === 'animate' && (
                <div className="p-3.5 space-y-4 text-xs">
                    {/* Top Action Bar: Replay Animation */}
                    <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 p-3.5 rounded-2xl text-white shadow-md flex items-center justify-between">
                        <div>
                            <span className="font-extrabold text-sm flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-300" />
                                <span>Canva-Style Animations</span>
                            </span>
                            <p className="text-[11px] text-purple-200 mt-0.5">
                                Efek transisi masuk elemen saat tampil di story
                            </p>
                        </div>

                        <button
                            onClick={replayAnimation}
                            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 border border-white/30 backdrop-blur-xs transition-all"
                            title="Putar ulang preview animasi"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Replay</span>
                        </button>
                    </div>

                    {/* 1. ANIMASI TABEL JADWAL (Default: Pan ke Kanan) */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <Layout className="w-3.5 h-3.5 text-purple-600" />
                                <span>Animasi Tabel Jadwal Dokter</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                                {config.tableAnimation || 'pan-right'}
                            </span>
                        </div>

                        {/* Animation Choice Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            <AnimationOptionCard
                                label="Pan Kanan"
                                description="Masuk ke kanan"
                                icon={ArrowRight}
                                isSelected={config.tableAnimation === 'pan-right'}
                                onClick={() => {
                                    updateConfig('tableAnimation', 'pan-right');
                                    replayAnimation();
                                }}
                            />
                            <AnimationOptionCard
                                label="Rise"
                                description="Naik dari bawah"
                                icon={ArrowUp}
                                isSelected={config.tableAnimation === 'rise'}
                                onClick={() => {
                                    updateConfig('tableAnimation', 'rise');
                                    replayAnimation();
                                }}
                            />
                            <AnimationOptionCard
                                label="Pan Kiri"
                                description="Masuk ke kiri"
                                icon={ArrowLeft}
                                isSelected={config.tableAnimation === 'pan-left'}
                                onClick={() => {
                                    updateConfig('tableAnimation', 'pan-left');
                                    replayAnimation();
                                }}
                            />
                            <AnimationOptionCard
                                label="Fade"
                                description="Memudar halus"
                                icon={Eye}
                                isSelected={config.tableAnimation === 'fade'}
                                onClick={() => {
                                    updateConfig('tableAnimation', 'fade');
                                    replayAnimation();
                                }}
                            />
                            <AnimationOptionCard
                                label="Pop / Zoom"
                                description="Membesar elastis"
                                icon={Maximize2}
                                isSelected={config.tableAnimation === 'pop'}
                                onClick={() => {
                                    updateConfig('tableAnimation', 'pop');
                                    replayAnimation();
                                }}
                            />
                            <AnimationOptionCard
                                label="None"
                                description="Tanpa animasi"
                                icon={RotateCcw}
                                isSelected={config.tableAnimation === 'none'}
                                onClick={() => {
                                    updateConfig('tableAnimation', 'none');
                                    replayAnimation();
                                }}
                            />
                        </div>
                    </div>

                    {/* 2. ANIMASI BADGE HARI (Default: Rise / Bawah ke Atas) */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                                <span>Animasi Badge Hari / Tanggal</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                                {config.dayBadgeAnimation || 'rise'}
                            </span>
                        </div>

                        {/* Animation Choice Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            <AnimationOptionCard
                                label="Rise"
                                description="Bawah ke atas"
                                icon={ArrowUp}
                                isSelected={config.dayBadgeAnimation === 'rise'}
                                onClick={() => {
                                    updateConfig('dayBadgeAnimation', 'rise');
                                    replayAnimation();
                                }}
                            />
                            <AnimationOptionCard
                                label="Pan Kanan"
                                description="Geser ke kanan"
                                icon={ArrowRight}
                                isSelected={config.dayBadgeAnimation === 'pan-right'}
                                onClick={() => {
                                    updateConfig('dayBadgeAnimation', 'pan-right');
                                    replayAnimation();
                                }}
                            />
                            <AnimationOptionCard
                                label="Pop / Zoom"
                                description="Membesar elastis"
                                icon={Maximize2}
                                isSelected={config.dayBadgeAnimation === 'pop'}
                                onClick={() => {
                                    updateConfig('dayBadgeAnimation', 'pop');
                                    replayAnimation();
                                }}
                            />
                            <AnimationOptionCard
                                label="Drop"
                                description="Turun dari atas"
                                icon={ArrowDown}
                                isSelected={config.dayBadgeAnimation === 'drop'}
                                onClick={() => {
                                    updateConfig('dayBadgeAnimation', 'drop');
                                    replayAnimation();
                                }}
                            />
                            <AnimationOptionCard
                                label="Fade"
                                description="Memudar halus"
                                icon={Eye}
                                isSelected={config.dayBadgeAnimation === 'fade'}
                                onClick={() => {
                                    updateConfig('dayBadgeAnimation', 'fade');
                                    replayAnimation();
                                }}
                            />
                            <AnimationOptionCard
                                label="None"
                                description="Tanpa animasi"
                                icon={RotateCcw}
                                isSelected={config.dayBadgeAnimation === 'none'}
                                onClick={() => {
                                    updateConfig('dayBadgeAnimation', 'none');
                                    replayAnimation();
                                }}
                            />
                        </div>
                    </div>

                    {/* 3. TIMING & DURATION SETTINGS */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <Zap className="w-3.5 h-3.5 text-purple-600" />
                            <span>Durasi & Kecepatan Animasi</span>
                        </span>

                        <div>
                            <div className="flex justify-between text-slate-700 font-bold mb-1">
                                <span>Durasi Masuk (Kecepatan):</span>
                                <span className="font-extrabold text-purple-700">{config.animationDuration || 0.8} detik</span>
                            </div>
                            <input
                                type="range"
                                min="0.3"
                                max="2.0"
                                step="0.05"
                                value={config.animationDuration || 0.8}
                                onChange={(e) => {
                                    updateConfig('animationDuration', parseFloat(e.target.value));
                                }}
                                className="w-full accent-purple-600"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                <span>Cepat (0.3s)</span>
                                <span>Sedang (0.8s)</span>
                                <span>Lambat (2.0s)</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="text-slate-600 font-medium flex justify-between text-[10px]">
                                    <span>Delay Badge:</span>
                                    <span className="font-bold text-purple-700">{config.animationDelayBadge || 0.15}s</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1.0"
                                    step="0.05"
                                    value={config.animationDelayBadge || 0.15}
                                    onChange={(e) => updateConfig('animationDelayBadge', parseFloat(e.target.value))}
                                    className="w-full mt-1 accent-purple-600"
                                />
                            </div>

                            <div>
                                <label className="text-slate-600 font-medium flex justify-between text-[10px]">
                                    <span>Delay Tabel:</span>
                                    <span className="font-bold text-purple-700">{config.animationDelayTable || 0.35}s</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1.0"
                                    step="0.05"
                                    value={config.animationDelayTable || 0.35}
                                    onChange={(e) => updateConfig('animationDelayTable', parseFloat(e.target.value))}
                                    className="w-full mt-1 accent-purple-600"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: DESIGN, SCALE & POSITION CONTROLS */}
            {activeTab === 'design' && (
                <div className="p-3.5 space-y-4 text-xs">
                    {/* Reset All Design Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={resetConfig}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:underline"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Semua Layout ke Default</span>
                        </button>
                    </div>

                    {/* 1. LOGO SILOAM SETTINGS */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                                <span>Logo Siloam (Kiri Atas)</span>
                            </span>
                            <button
                                onClick={() => updateConfig('showLogo', !config.showLogo)}
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                    config.showLogo ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                                {config.showLogo ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {config.showLogo && (
                            <div className="space-y-3 pt-1">
                                <NumberSliderField
                                    label="Skala Logo (Scale)"
                                    value={config.logoScale || 1}
                                    min={0.2}
                                    max={3.0}
                                    step={0.05}
                                    unit="%"
                                    isPercentage={true}
                                    onChange={(val) => updateConfig('logoScale', val)}
                                />

                                <div className="grid grid-cols-2 gap-2.5">
                                    <NumberSliderField
                                        label="Posisi X"
                                        value={config.logoOffsetX || 0}
                                        min={-300}
                                        max={300}
                                        step={1}
                                        unit="px"
                                        onChange={(val) => updateConfig('logoOffsetX', val)}
                                    />
                                    <NumberSliderField
                                        label="Posisi Y"
                                        value={config.logoOffsetY || 0}
                                        min={-300}
                                        max={300}
                                        step={1}
                                        unit="px"
                                        onChange={(val) => updateConfig('logoOffsetY', val)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. HEADER TITLE ("EXECUTIVE Clinic") */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <Type className="w-3.5 h-3.5 text-blue-600" />
                                <span>Judul "EXECUTIVE Clinic"</span>
                            </span>
                            <button
                                onClick={() => updateConfig('showTitle', config.showTitle === false ? true : false)}
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                    config.showTitle !== false ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                                {config.showTitle !== false ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {config.showTitle !== false && (
                            <div className="space-y-3 pt-1">
                                <NumberSliderField
                                    label="Skala Judul (Scale)"
                                    value={config.headerScale || 1}
                                    min={0.2}
                                    max={3.0}
                                    step={0.05}
                                    unit="%"
                                    isPercentage={true}
                                    onChange={(val) => updateConfig('headerScale', val)}
                                />

                                <div className="grid grid-cols-2 gap-2.5">
                                    <NumberSliderField
                                        label="Posisi X"
                                        value={config.headerOffsetX || 0}
                                        min={-400}
                                        max={400}
                                        step={1}
                                        unit="px"
                                        onChange={(val) => updateConfig('headerOffsetX', val)}
                                    />
                                    <NumberSliderField
                                        label="Posisi Y"
                                        value={config.headerOffsetY || 0}
                                        min={-400}
                                        max={400}
                                        step={1}
                                        unit="px"
                                        onChange={(val) => updateConfig('headerOffsetY', val)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. DAY BADGE PILL */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                <span>Badge Hari / Tanggal</span>
                            </span>
                            <button
                                onClick={() => updateConfig('showDayBadge', !config.showDayBadge)}
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                    config.showDayBadge ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                                {config.showDayBadge ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {config.showDayBadge && (
                            <div className="space-y-3 pt-1">
                                <div>
                                    <label className="text-slate-600 font-medium text-[11px]">Kustom Teks Hari/Tanggal:</label>
                                    <input
                                        type="text"
                                        value={config.customDayBadge || ''}
                                        onChange={(e) => updateConfig('customDayBadge', e.target.value)}
                                        placeholder={selectedDay}
                                        className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    <NumberSliderField
                                        label="Skala Badge"
                                        value={config.dayBadgeScale || 1}
                                        min={0.2}
                                        max={3.0}
                                        step={0.05}
                                        unit="%"
                                        isPercentage={true}
                                        onChange={(val) => updateConfig('dayBadgeScale', val)}
                                    />
                                    <NumberSliderField
                                        label="Ukuran Font"
                                        value={config.dayBadgeFontSize || 28}
                                        min={12}
                                        max={60}
                                        step={1}
                                        unit="px"
                                        onChange={(val) => updateConfig('dayBadgeFontSize', val)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    <NumberSliderField
                                        label="Posisi X"
                                        value={config.dayBadgeOffsetX || 0}
                                        min={-400}
                                        max={400}
                                        step={1}
                                        unit="px"
                                        onChange={(val) => updateConfig('dayBadgeOffsetX', val)}
                                    />
                                    <NumberSliderField
                                        label="Posisi Y"
                                        value={config.dayBadgeOffsetY || 0}
                                        min={-400}
                                        max={400}
                                        step={1}
                                        unit="px"
                                        onChange={(val) => updateConfig('dayBadgeOffsetY', val)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4. SCHEDULE TABLE CONTAINER */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <Layout className="w-3.5 h-3.5 text-blue-600" />
                            <span>Tabel Jadwal Dokter (Frosted Glass)</span>
                        </span>

                        <div className="grid grid-cols-2 gap-2.5">
                            <NumberSliderField
                                label="Skala Tabel"
                                value={config.tableScale || 1}
                                min={0.4}
                                max={2.0}
                                step={0.05}
                                unit="%"
                                isPercentage={true}
                                onChange={(val) => updateConfig('tableScale', val)}
                            />
                            <NumberSliderField
                                label="Lebar Tabel"
                                value={config.tableWidth || 960}
                                min={700}
                                max={1060}
                                step={5}
                                unit="px"
                                onChange={(val) => updateConfig('tableWidth', val)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <NumberSliderField
                                label="Posisi X"
                                value={config.tableOffsetX || 0}
                                min={-300}
                                max={300}
                                step={1}
                                unit="px"
                                onChange={(val) => updateConfig('tableOffsetX', val)}
                            />
                            <NumberSliderField
                                label="Posisi Y"
                                value={config.tableOffsetY || 0}
                                min={-500}
                                max={500}
                                step={1}
                                unit="px"
                                onChange={(val) => updateConfig('tableOffsetY', val)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <NumberSliderField
                                label="Padding Atas/Bwh"
                                value={config.tablePaddingY || 12}
                                min={0}
                                max={40}
                                step={1}
                                unit="px"
                                onChange={(val) => updateConfig('tablePaddingY', val)}
                            />
                            <NumberSliderField
                                label="Padding Kiri/Knn"
                                value={config.tablePaddingX || 28}
                                min={8}
                                max={80}
                                step={1}
                                unit="px"
                                onChange={(val) => updateConfig('tablePaddingX', val)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <NumberSliderField
                                label="Opasitas Kaca"
                                value={config.cardOpacity || 0.92}
                                min={0.3}
                                max={1.0}
                                step={0.02}
                                unit="%"
                                isPercentage={true}
                                onChange={(val) => updateConfig('cardOpacity', val)}
                            />
                            <NumberSliderField
                                label="Blur Kaca"
                                value={config.cardBlur || 20}
                                min={0}
                                max={40}
                                step={1}
                                unit="px"
                                onChange={(val) => updateConfig('cardBlur', val)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <NumberSliderField
                                label="Jarak Antar Baris"
                                value={config.rowSpacing || 10}
                                min={0}
                                max={30}
                                step={1}
                                unit="px"
                                onChange={(val) => updateConfig('rowSpacing', val)}
                            />
                            <NumberSliderField
                                label="Ukuran Avatar Bulat"
                                value={config.avatarSize || 64}
                                min={40}
                                max={120}
                                step={2}
                                unit="px"
                                onChange={(val) => updateConfig('avatarSize', val)}
                            />
                        </div>
                    </div>

                    {/* 5. TYPOGRAPHY & FONT SIZES */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <Type className="w-3.5 h-3.5 text-blue-600" />
                            <span>Ukuran Font & Teks Tabel</span>
                        </span>

                        <div className="grid grid-cols-3 gap-2">
                            <NumberSliderField
                                label="Nama Dokter"
                                value={config.nameFontSize || 20}
                                min={12}
                                max={36}
                                step={1}
                                unit="px"
                                onChange={(val) => updateConfig('nameFontSize', val)}
                            />
                            <NumberSliderField
                                label="Spesialis"
                                value={config.specialtyFontSize || 13}
                                min={9}
                                max={26}
                                step={1}
                                unit="px"
                                onChange={(val) => updateConfig('specialtyFontSize', val)}
                            />
                            <NumberSliderField
                                label="Jam Praktik"
                                value={config.timeFontSize || 20}
                                min={12}
                                max={36}
                                step={1}
                                unit="px"
                                onChange={(val) => updateConfig('timeFontSize', val)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <NumberSliderField
                                label="Tinggi Header"
                                value={config.tableHeaderHeight || 70}
                                min={40}
                                max={120}
                                step={2}
                                unit="px"
                                onChange={(val) => updateConfig('tableHeaderHeight', val)}
                            />
                            <NumberSliderField
                                label="Font Header"
                                value={config.tableHeaderFontSize || 26}
                                min={16}
                                max={40}
                                step={1}
                                unit="px"
                                onChange={(val) => updateConfig('tableHeaderFontSize', val)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold block">Teks Header Kiri:</label>
                                <input
                                    type="text"
                                    value={config.tableTitleName || 'Nama Dokter'}
                                    onChange={(e) => updateConfig('tableTitleName', e.target.value)}
                                    className="w-full mt-1 p-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 font-bold block">Teks Header Kanan:</label>
                                <input
                                    type="text"
                                    value={config.tableTitleSchedule || 'Jadwal'}
                                    onChange={(e) => updateConfig('tableTitleSchedule', e.target.value)}
                                    className="w-full mt-1 p-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded focus:bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 6. FOOTERS (KIRI & KANAN) */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                                <span>Footer (Bawah Kiri & Kanan)</span>
                            </span>
                            <button
                                onClick={() => updateConfig('showFooters', !config.showFooters)}
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                    config.showFooters ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                                {config.showFooters ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {config.showFooters && (
                            <div className="space-y-3 pt-1">
                                {/* Footer Kiri */}
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                                    <span className="font-bold text-slate-700 text-[11px] block">Footer Kiri (Alamat):</span>
                                    <NumberSliderField
                                        label="Skala Footer Kiri"
                                        value={config.footerKiriScale || 1}
                                        min={0.4}
                                        max={2.0}
                                        step={0.05}
                                        unit="%"
                                        isPercentage={true}
                                        onChange={(val) => updateConfig('footerKiriScale', val)}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <NumberSliderField
                                            label="Posisi X"
                                            value={config.footerKiriOffsetX || 0}
                                            min={-200}
                                            max={200}
                                            step={1}
                                            unit="px"
                                            onChange={(val) => updateConfig('footerKiriOffsetX', val)}
                                        />
                                        <NumberSliderField
                                            label="Posisi Y"
                                            value={config.footerKiriOffsetY || 0}
                                            min={-200}
                                            max={200}
                                            step={1}
                                            unit="px"
                                            onChange={(val) => updateConfig('footerKiriOffsetY', val)}
                                        />
                                    </div>
                                </div>

                                {/* Footer Kanan */}
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                                    <span className="font-bold text-slate-700 text-[11px] block">Footer Kanan (Call Center 24/7):</span>
                                    <NumberSliderField
                                        label="Skala Footer Kanan"
                                        value={config.footerKananScale || 1}
                                        min={0.4}
                                        max={2.0}
                                        step={0.05}
                                        unit="%"
                                        isPercentage={true}
                                        onChange={(val) => updateConfig('footerKananScale', val)}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <NumberSliderField
                                            label="Posisi X"
                                            value={config.footerKananOffsetX || 0}
                                            min={-200}
                                            max={200}
                                            step={1}
                                            unit="px"
                                            onChange={(val) => updateConfig('footerKananOffsetX', val)}
                                        />
                                        <NumberSliderField
                                            label="Posisi Y"
                                            value={config.footerKananOffsetY || 0}
                                            min={-200}
                                            max={200}
                                            step={1}
                                            unit="px"
                                            onChange={(val) => updateConfig('footerKananOffsetY', val)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: VIDEO BACKGROUND & EFFECTS */}
            {activeTab === 'video' && (
                <div className="p-3.5 space-y-4 text-xs">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] block">
                            Pengaturan Video Background
                        </span>

                        <NumberSliderField
                            label="Kecerahan (Brightness)"
                            value={config.videoBrightness || 100}
                            min={30}
                            max={200}
                            step={1}
                            unit="%"
                            onChange={(val) => updateConfig('videoBrightness', val)}
                        />

                        <NumberSliderField
                            label="Kontras (Contrast)"
                            value={config.videoContrast || 100}
                            min={30}
                            max={200}
                            step={1}
                            unit="%"
                            onChange={(val) => updateConfig('videoContrast', val)}
                        />

                        <NumberSliderField
                            label="Saturasi Warna"
                            value={config.videoSaturate || 100}
                            min={0}
                            max={200}
                            step={1}
                            unit="%"
                            onChange={(val) => updateConfig('videoSaturate', val)}
                        />

                        <NumberSliderField
                            label="Kegelapan Overlay Latar"
                            value={config.overlayDarkness || 0}
                            min={0}
                            max={80}
                            step={1}
                            unit="%"
                            onChange={(val) => updateConfig('overlayDarkness', val)}
                        />
                    </div>
                </div>
            )}

            {/* Modal Atur Posisi Foto Dokter */}
            <DoctorPhotoModal
                isOpen={Boolean(photoModalDoc)}
                onClose={() => setPhotoModalDoc(null)}
                doctor={photoModalDoc}
                onUpdate={(docId, fields) => {
                    updateMasterDoctorPhoto(docId, fields);
                    updateDoctorBatch(docId, fields);
                    if (photoModalDoc && (photoModalDoc.id === docId || photoModalDoc.slug === docId)) {
                        setPhotoModalDoc(prev => ({ ...prev, ...fields }));
                    }
                }}
                onApplyToAll={(fields) => {
                    (allExecutiveDoctorsList || []).forEach(d => {
                        updateMasterDoctorPhoto(d.slug || d.id, fields);
                    });
                    dailyDoctors.forEach(d => {
                        updateDoctorBatch(d.id, fields);
                    });
                }}
            />

            {/* Modal Tambah Dokter Manual */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-3 text-blue-900 font-extrabold text-sm">
                            <Plus className="w-4 h-4" />
                            <span>Tambah Dokter Kustom</span>
                        </div>

                        <form onSubmit={handleAddDoctorSubmit} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Lengkap & Gelar Dokter:</label>
                                <input
                                    type="text"
                                    required
                                    value={newDocForm.name}
                                    onChange={(e) => setNewDocForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Contoh: dr. Budi Santoso, Sp.A"
                                    className="w-full p-2 border border-slate-200 rounded-lg font-semibold focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Spesialisasi:</label>
                                <input
                                    type="text"
                                    required
                                    value={newDocForm.specialty}
                                    onChange={(e) => setNewDocForm(prev => ({ ...prev, specialty: e.target.value }))}
                                    placeholder="Contoh: Spesialis Anak"
                                    className="w-full p-2 border border-slate-200 rounded-lg font-semibold focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Jam Praktik:</label>
                                <input
                                    type="text"
                                    required
                                    value={newDocForm.time}
                                    onChange={(e) => setNewDocForm(prev => ({ ...prev, time: e.target.value }))}
                                    placeholder="14:00–17:00"
                                    className="w-full p-2 border border-slate-200 rounded-lg font-semibold focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                                >
                                    Tambahkan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
