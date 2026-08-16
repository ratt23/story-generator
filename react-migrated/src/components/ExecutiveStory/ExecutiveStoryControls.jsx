import { useState, useMemo } from 'react';
import { useExecutiveStory } from '../../context/ExecutiveStoryContext';
import { DAYS_LIST, getDoctorInitials } from '../../utils/imageHelper';
import { uploadLogoToCloudinary } from '../../utils/cloudinaryUpload';
import {
    Search,
    Stethoscope,
    Palette,
    Calendar,
    Type,
    Sliders,
    Eye,
    RotateCcw,
    Check,
    ChevronDown,
    ChevronUp,
    MoveVertical,
    Move,
    FlipHorizontal,
    Pipette,
    Upload,
    Image as ImageIcon,
    Trash2,
    Save,
    Loader2,
    CreditCard
} from 'lucide-react';

const THEMES = [
    {
        id: 'white-gold',
        name: 'White Gold (Default)',
        bg: 'from-white via-amber-50 to-amber-100',
        accent: 'bg-amber-500'
    },
    {
        id: 'royal-navy-gold',
        name: 'Royal Navy & Gold',
        bg: 'from-[#001f5c] to-[#020a1c]',
        accent: 'bg-amber-400'
    },
    {
        id: 'onyx-gold',
        name: 'Onyx Black & Gold',
        bg: 'from-slate-950 to-slate-900',
        accent: 'bg-amber-500'
    },
    {
        id: 'emerald-luxury',
        name: 'Emerald Executive',
        bg: 'from-emerald-950 to-emerald-900',
        accent: 'bg-emerald-400'
    },
    {
        id: 'siloam-blue',
        name: 'Siloam Signature Blue',
        bg: 'from-sky-900 to-[#003b73]',
        accent: 'bg-sky-400'
    }
];

const FONT_COLOR_PRESETS = [
    { name: 'Navy Siloam', color: '#001f5c' },
    { name: 'Gold / Amber', color: '#d97706' },
    { name: 'Charcoal Black', color: '#0f172a' },
    { name: 'Royal Blue', color: '#1d4ed8' },
    { name: 'Pure White', color: '#ffffff' },
    { name: 'Emerald', color: '#047857' }
];

const DOCTOR_CARD_COLOR_PRESETS = [
    { name: 'Dark Navy', color: '#001238' },
    { name: 'Siloam Navy', color: '#001f5c' },
    { name: 'Charcoal Black', color: '#0f172a' },
    { name: 'Pure White', color: '#ffffff' },
    { name: 'Amber Gold', color: '#d97706' },
    { name: 'Emerald', color: '#047857' }
];

export const ExecutiveStoryControls = ({
    executiveDoctors = [],
    allDoctors = [],
    loading = false
}) => {
    const {
        selectedDoctor,
        selectDoctor,
        config,
        updateConfig,
        updateSchedule,
        resetToDoctorDefault,
        resetPositions,
        saveLogoSettings,
        resetLogoSettings
    } = useExecutiveStory();

    // Source tab: 'executive' | 'all'
    const [doctorSource, setDoctorSource] = useState('executive');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('ALL');

    // Accordion active section
    const [activeSection, setActiveSection] = useState('doctor'); // 'doctor' | 'logo' | 'layout' | 'card' | 'photo' | 'schedule' | 'theme' | 'text' | 'toggles'

    // Logo Upload State
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [logoUploadError, setLogoUploadError] = useState('');
    const [saveLogoSuccess, setSaveLogoSuccess] = useState(false);

    const toggleSection = (section) => {
        setActiveSection(prev => prev === section ? '' : section);
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingLogo(true);
            setLogoUploadError('');
            const result = await uploadLogoToCloudinary(file);
            if (result?.secure_url) {
                updateConfig('customLogoUrl', result.secure_url);
            }
        } catch (err) {
            console.error('Logo upload failed:', err);
            setLogoUploadError(err.message || 'Gagal mengunggah logo');
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleSaveLogo = () => {
        const ok = saveLogoSettings();
        if (ok) {
            setSaveLogoSuccess(true);
            setTimeout(() => setSaveLogoSuccess(false), 2500);
        }
    };

    const currentDoctorPool = doctorSource === 'executive' ? executiveDoctors : allDoctors;

    const specialties = useMemo(() => {
        const set = new Set();
        currentDoctorPool.forEach(d => {
            if (d.specialty) set.add(d.specialty);
        });
        return ['ALL', ...Array.from(set).sort()];
    }, [currentDoctorPool]);

    const filteredDoctors = useMemo(() => {
        return currentDoctorPool.filter(doc => {
            const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSpecialty = selectedSpecialtyFilter === 'ALL' || doc.specialty === selectedSpecialtyFilter;
            return matchesSearch && matchesSpecialty;
        });
    }, [currentDoctorPool, searchQuery, selectedSpecialtyFilter]);

    return (
        <div className="flex flex-col h-full bg-white divide-y divide-slate-200">
            {/* ======================================================== */}
            {/* 1. SECTION: PILIH DOKTER                                 */}
            {/* ======================================================== */}
            <div className="flex flex-col">
                <button
                    onClick={() => toggleSection('doctor')}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-slate-800 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-blue-600" />
                        <span>Pilih Dokter ({filteredDoctors.length})</span>
                    </div>
                    {activeSection === 'doctor' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeSection === 'doctor' && (
                    <div className="p-4 space-y-3 bg-white">
                        {/* Source Switcher */}
                        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
                            <button
                                onClick={() => setDoctorSource('executive')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                                    doctorSource === 'executive'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Executive Clinic ({executiveDoctors.length})
                            </button>
                            <button
                                onClick={() => setDoctorSource('all')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                                    doctorSource === 'all'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Semua Dokter ({allDoctors.length})
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Cari nama atau spesialis..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Specialty Filter Dropdown */}
                        {specialties.length > 2 && (
                            <select
                                value={selectedSpecialtyFilter}
                                onChange={(e) => setSelectedSpecialtyFilter(e.target.value)}
                                className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                {specialties.map(sp => (
                                    <option key={sp} value={sp}>
                                        {sp === 'ALL' ? 'Semua Spesialisasi' : `Spesialis ${sp}`}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Doctor List */}
                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                            {loading ? (
                                <div className="text-center py-6 text-xs text-slate-400">Memuat data dokter...</div>
                            ) : filteredDoctors.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-400">Dokter tidak ditemukan.</div>
                            ) : (
                                filteredDoctors.map((doc) => {
                                    const isSelected = selectedDoctor?.id === doc.id;
                                    return (
                                        <div
                                            key={doc.id}
                                            onClick={() => selectDoctor(doc)}
                                            className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border ${
                                                isSelected
                                                    ? 'bg-blue-50 border-blue-400 shadow-xs ring-1 ring-blue-400'
                                                    : 'bg-white hover:bg-slate-50 border-slate-100'
                                            }`}
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
                                                {doc.image_url ? (
                                                    <img
                                                        src={doc.image_url}
                                                        alt={doc.name}
                                                        className="w-full h-full object-cover object-top"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <span className="text-xs font-black text-slate-400">
                                                        {getDoctorInitials(doc.name)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold text-slate-800 truncate leading-tight">
                                                    {doc.name}
                                                </h4>
                                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                    Spesialis {doc.specialty}
                                                </p>
                                                {doc.isOnLeave && (
                                                    <span className="inline-block mt-0.5 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                                        Cuti
                                                    </span>
                                                )}
                                            </div>

                                            {isSelected && (
                                                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* 2. SECTION: LOGO & BRANDING (KIRI ATAS)                  */}
            {/* ======================================================== */}
            <div className="flex flex-col">
                <button
                    onClick={() => toggleSection('logo')}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-slate-800 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-rose-600" />
                        <span>Logo & Branding (Kiri Atas)</span>
                    </div>
                    {activeSection === 'logo' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeSection === 'logo' && (
                    <div className="p-4 space-y-3.5 bg-white">
                        {/* Logo Upload Box */}
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                            {config.customLogoUrl ? (
                                <div className="space-y-2">
                                    <div className="h-14 flex items-center justify-center p-1 bg-white rounded-lg border border-slate-200 shadow-xs">
                                        <img
                                            src={config.customLogoUrl}
                                            alt="Custom Logo"
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </div>
                                    <div className="flex items-center justify-center gap-2">
                                        <label className="cursor-pointer text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                                            <span>Ganti Logo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="hidden"
                                                disabled={isUploadingLogo}
                                            />
                                        </label>
                                        <button
                                            onClick={() => updateConfig('customLogoUrl', '')}
                                            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Hapus</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center py-2">
                                    {isUploadingLogo ? (
                                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-1" />
                                    ) : (
                                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                                    )}
                                    <span className="text-xs font-bold text-slate-700">
                                        {isUploadingLogo ? 'Mengunggah ke Cloudinary...' : 'Upload Logo Kustom'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">
                                        Format PNG, SVG, JPG (Max 5MB)
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                        disabled={isUploadingLogo}
                                    />
                                </label>
                            )}
                        </div>

                        {logoUploadError && (
                            <p className="text-[11px] font-bold text-rose-600 bg-rose-50 p-2 rounded-lg">
                                {logoUploadError}
                            </p>
                        )}

                        {/* Logo Scale Slider */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Ukuran Logo (Zoom)</span>
                                <span className="text-rose-600">{Math.round((config.logoScale !== undefined ? config.logoScale : 1) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.4"
                                max="2.5"
                                step="0.05"
                                value={config.logoScale !== undefined ? config.logoScale : 1}
                                onChange={(e) => updateConfig('logoScale', parseFloat(e.target.value))}
                                className="w-full accent-rose-600"
                            />
                        </div>

                        {/* Logo Horizontal Position */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Posisi Horizontal Logo (Kiri/Kanan)</span>
                                <span className="text-rose-600">{config.logoOffsetX || 0}px</span>
                            </div>
                            <input
                                type="range"
                                min="-80"
                                max="300"
                                step="2"
                                value={config.logoOffsetX || 0}
                                onChange={(e) => updateConfig('logoOffsetX', parseInt(e.target.value))}
                                className="w-full accent-rose-600"
                            />
                        </div>

                        {/* Logo Vertical Position */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Posisi Vertikal Logo (Atas/Bawah)</span>
                                <span className="text-rose-600">{config.logoOffsetY || 0}px</span>
                            </div>
                            <input
                                type="range"
                                min="-40"
                                max="150"
                                step="2"
                                value={config.logoOffsetY || 0}
                                onChange={(e) => updateConfig('logoOffsetY', parseInt(e.target.value))}
                                className="w-full accent-rose-600"
                            />
                        </div>

                        {/* Save & Reset Buttons */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                            <button
                                onClick={handleSaveLogo}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{saveLogoSuccess ? 'Tersimpan!' : 'Simpan Setting Logo'}</span>
                            </button>

                            <button
                                onClick={resetLogoSettings}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 font-semibold"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset Logo</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* 3. SECTION: ATUR POSISI & TATA LETAK ELEMEN              */}
            {/* ======================================================== */}
            <div className="flex flex-col">
                <button
                    onClick={() => toggleSection('layout')}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-slate-800 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <MoveVertical className="w-4 h-4 text-indigo-600" />
                        <span>Atur Posisi & Tata Letak</span>
                    </div>
                    {activeSection === 'layout' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeSection === 'layout' && (
                    <div className="p-4 space-y-4 bg-white">
                        {/* Top Label (Badge) Y Offset */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Posisi Label Atas (Badge)</span>
                                <span className="text-indigo-600">{config.tagOffsetY || 0}px</span>
                            </div>
                            <input
                                type="range"
                                min="-50"
                                max="80"
                                step="2"
                                value={config.tagOffsetY || 0}
                                onChange={(e) => updateConfig('tagOffsetY', parseInt(e.target.value))}
                                className="w-full accent-indigo-600"
                            />
                        </div>

                        {/* Title Y Offset */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Posisi Judul (Atas/Bawah)</span>
                                <span className="text-indigo-600">{config.headerOffsetY || 0}px</span>
                            </div>
                            <input
                                type="range"
                                min="-60"
                                max="100"
                                step="2"
                                value={config.headerOffsetY || 0}
                                onChange={(e) => updateConfig('headerOffsetY', parseInt(e.target.value))}
                                className="w-full accent-indigo-600"
                            />
                        </div>

                        {/* Doctor Card Y Offset */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Posisi Kartu Dokter</span>
                                <span className="text-indigo-600">{config.doctorCardOffsetY || 0}px</span>
                            </div>
                            <input
                                type="range"
                                min="-100"
                                max="120"
                                step="2"
                                value={config.doctorCardOffsetY || 0}
                                onChange={(e) => updateConfig('doctorCardOffsetY', parseInt(e.target.value))}
                                className="w-full accent-indigo-600"
                            />
                        </div>

                        {/* Schedule & Registration Y Offset */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Posisi Jadwal & Reservasi</span>
                                <span className="text-indigo-600">{config.scheduleOffsetY || 0}px</span>
                            </div>
                            <input
                                type="range"
                                min="-120"
                                max="150"
                                step="2"
                                value={config.scheduleOffsetY || 0}
                                onChange={(e) => updateConfig('scheduleOffsetY', parseInt(e.target.value))}
                                className="w-full accent-indigo-600"
                            />
                        </div>

                        {/* Spacing / Gap Slider */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Jarak Spasi Antar Kartu</span>
                                <span className="text-indigo-600">{config.scheduleGap !== undefined ? config.scheduleGap : 45}px</span>
                            </div>
                            <input
                                type="range"
                                min="15"
                                max="80"
                                step="2"
                                value={config.scheduleGap !== undefined ? config.scheduleGap : 45}
                                onChange={(e) => updateConfig('scheduleGap', parseInt(e.target.value))}
                                className="w-full accent-indigo-600"
                            />
                        </div>

                        <button
                            onClick={resetPositions}
                            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold pt-1"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Posisi ke Default</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* 4. SECTION: ATUR KARTU DOKTER (UKURAN & FONT)            */}
            {/* ======================================================== */}
            <div className="flex flex-col">
                <button
                    onClick={() => toggleSection('card')}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-slate-800 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-600" />
                        <span>Atur Kartu Dokter (Ukuran & Font)</span>
                    </div>
                    {activeSection === 'card' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeSection === 'card' && (
                    <div className="p-4 space-y-4 bg-white">
                        {/* Doctor Card Scale */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Ukuran Kartu Dokter (Zoom)</span>
                                <span className="text-amber-600">{Math.round((config.doctorCardScale || 1) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.7"
                                max="1.4"
                                step="0.02"
                                value={config.doctorCardScale || 1}
                                onChange={(e) => updateConfig('doctorCardScale', parseFloat(e.target.value))}
                                className="w-full accent-amber-600"
                            />
                        </div>

                        {/* Doctor Name Font Size */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Ukuran Font Nama Dokter</span>
                                <span className="text-amber-600">{config.doctorNameFontSize ? `${config.doctorNameFontSize}px` : 'Auto'}</span>
                            </div>
                            <input
                                type="range"
                                min="18"
                                max="42"
                                step="1"
                                value={config.doctorNameFontSize || 28}
                                onChange={(e) => updateConfig('doctorNameFontSize', parseInt(e.target.value))}
                                className="w-full accent-amber-600"
                            />
                        </div>

                        {/* Doctor Specialty Font Size */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Ukuran Font Spesialisasi</span>
                                <span className="text-amber-600">{config.doctorSpecialtyFontSize ? `${config.doctorSpecialtyFontSize}px` : '17px (Auto)'}</span>
                            </div>
                            <input
                                type="range"
                                min="12"
                                max="26"
                                step="1"
                                value={config.doctorSpecialtyFontSize || 17}
                                onChange={(e) => updateConfig('doctorSpecialtyFontSize', parseInt(e.target.value))}
                                className="w-full accent-amber-600"
                            />
                        </div>

                        {/* Doctor Name Font Color */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Pipette className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Warna Font Nama Dokter</span>
                                </label>
                                {config.doctorNameColor && (
                                    <button
                                        onClick={() => updateConfig('doctorNameColor', '')}
                                        className="text-[10px] text-slate-400 hover:text-amber-600"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {DOCTOR_CARD_COLOR_PRESETS.map((p) => {
                                    const isSel = (config.doctorNameColor || '#001238') === p.color;
                                    return (
                                        <button
                                            key={p.color}
                                            onClick={() => updateConfig('doctorNameColor', p.color)}
                                            className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                                                isSel ? 'border-amber-500 scale-110 shadow-xs' : 'border-slate-300 hover:scale-105'
                                            }`}
                                            style={{ backgroundColor: p.color }}
                                            title={p.name}
                                        >
                                            {isSel && (
                                                <div className={`w-1.5 h-1.5 rounded-full ${p.color === '#ffffff' ? 'bg-slate-800' : 'bg-white'}`} />
                                            )}
                                        </button>
                                    );
                                })}
                                <label className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-400" title="Warna Khusus">
                                    <input
                                        type="color"
                                        value={config.doctorNameColor || '#001238'}
                                        onChange={(e) => updateConfig('doctorNameColor', e.target.value)}
                                        className="opacity-0 w-0 h-0 cursor-pointer"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Doctor Specialty Font Color */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Pipette className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Warna Font Spesialisasi</span>
                                </label>
                                {config.doctorSpecialtyColor && (
                                    <button
                                        onClick={() => updateConfig('doctorSpecialtyColor', '')}
                                        className="text-[10px] text-slate-400 hover:text-blue-600"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {DOCTOR_CARD_COLOR_PRESETS.map((p) => {
                                    const isSel = (config.doctorSpecialtyColor || '#001f5c') === p.color;
                                    return (
                                        <button
                                            key={p.color}
                                            onClick={() => updateConfig('doctorSpecialtyColor', p.color)}
                                            className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                                                isSel ? 'border-blue-500 scale-110 shadow-xs' : 'border-slate-300 hover:scale-105'
                                            }`}
                                            style={{ backgroundColor: p.color }}
                                            title={p.name}
                                        >
                                            {isSel && (
                                                <div className={`w-1.5 h-1.5 rounded-full ${p.color === '#ffffff' ? 'bg-slate-800' : 'bg-white'}`} />
                                            )}
                                        </button>
                                    );
                                })}
                                <label className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-400" title="Warna Khusus">
                                    <input
                                        type="color"
                                        value={config.doctorSpecialtyColor || '#001f5c'}
                                        onChange={(e) => updateConfig('doctorSpecialtyColor', e.target.value)}
                                        className="opacity-0 w-0 h-0 cursor-pointer"
                                    />
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                updateConfig('doctorCardScale', 1);
                                updateConfig('doctorNameFontSize', 0);
                                updateConfig('doctorSpecialtyFontSize', 0);
                                updateConfig('doctorNameColor', '');
                                updateConfig('doctorSpecialtyColor', '');
                            }}
                            className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-semibold pt-1"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Tampilan Kartu Dokter</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* 5. SECTION: ATUR POSISI & ZOOM / FLIP FOTO DOKTER        */}
            {/* ======================================================== */}
            <div className="flex flex-col">
                <button
                    onClick={() => toggleSection('photo')}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-slate-800 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <Move className="w-4 h-4 text-blue-600" />
                        <span>Atur Posisi, Zoom & Flip Foto</span>
                    </div>
                    {activeSection === 'photo' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeSection === 'photo' && (
                    <div className="p-4 space-y-3 bg-white">
                        {/* Flip / Mirror Horizontal Toggle */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="flex items-center gap-2">
                                <FlipHorizontal className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-bold text-slate-700">Flip / Cermin Foto</span>
                            </div>
                            <button
                                onClick={() => updateConfig('photoFlipX', !config.photoFlipX)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    config.photoFlipX
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                            >
                                {config.photoFlipX ? 'Aktif (Terbalik)' : 'Normal'}
                            </button>
                        </div>

                        {/* Scale / Zoom Slider */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Ukuran Foto (Zoom)</span>
                                <span className="text-blue-600">{Math.round((config.photoScale || 1) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.7"
                                max="1.6"
                                step="0.05"
                                value={config.photoScale || 1}
                                onChange={(e) => updateConfig('photoScale', parseFloat(e.target.value))}
                                className="w-full accent-blue-600"
                            />
                        </div>

                        {/* Y-Offset Slider */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Posisi Vertikal Foto (Atas/Bawah)</span>
                                <span className="text-blue-600">{config.photoOffsetY || 0}px</span>
                            </div>
                            <input
                                type="range"
                                min="-120"
                                max="120"
                                step="2"
                                value={config.photoOffsetY || 0}
                                onChange={(e) => updateConfig('photoOffsetY', parseInt(e.target.value))}
                                className="w-full accent-blue-600"
                            />
                        </div>

                        {/* X-Offset Slider */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Posisi Horizontal Foto (Kiri/Kanan)</span>
                                <span className="text-blue-600">{config.photoOffsetX || 0}px</span>
                            </div>
                            <input
                                type="range"
                                min="-100"
                                max="100"
                                step="2"
                                value={config.photoOffsetX || 0}
                                onChange={(e) => updateConfig('photoOffsetX', parseInt(e.target.value))}
                                className="w-full accent-blue-600"
                            />
                        </div>

                        <button
                            onClick={() => {
                                updateConfig('photoScale', 1);
                                updateConfig('photoOffsetY', 0);
                                updateConfig('photoOffsetX', 0);
                                updateConfig('photoFlipX', false);
                            }}
                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold pt-1"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Posisi & Flip Foto</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* 6. SECTION: EDIT JAM PRAKTIK                             */}
            {/* ======================================================== */}
            <div className="flex flex-col">
                <button
                    onClick={() => toggleSection('schedule')}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-slate-800 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span>Edit Jam Praktik</span>
                    </div>
                    {activeSection === 'schedule' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeSection === 'schedule' && (
                    <div className="p-4 space-y-2.5 bg-white">
                        <p className="text-[11px] text-slate-500 mb-2">
                            Kosongkan hari yang tidak ada jadwal praktek.
                        </p>

                        {DAYS_LIST.map((day) => {
                            const val = (config.customSchedule && config.customSchedule[day]) || '';
                            return (
                                <div key={day} className="flex items-center gap-2">
                                    <span className="w-16 text-xs font-bold text-slate-700 shrink-0">
                                        {day}
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="cth: 18:00 - 20:00"
                                        value={val}
                                        onChange={(e) => updateSchedule(day, e.target.value)}
                                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    {val && (
                                        <button
                                            onClick={() => updateSchedule(day, '')}
                                            className="text-[10px] text-slate-400 hover:text-rose-500 px-1 py-1"
                                            title="Kosongkan"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* 7. SECTION: TEMA WARNA & FORMAT                          */}
            {/* ======================================================== */}
            <div className="flex flex-col">
                <button
                    onClick={() => toggleSection('theme')}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-slate-800 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-amber-600" />
                        <span>Tema & Format Kanvas</span>
                    </div>
                    {activeSection === 'theme' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeSection === 'theme' && (
                    <div className="p-4 space-y-4 bg-white">
                        {/* Format Switcher */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Ukuran Kanvas
                            </label>
                            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
                                <button
                                    onClick={() => updateConfig('format', 'story')}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                        config.format === 'story'
                                            ? 'bg-white text-blue-900 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    📱 Story (9:16 - 1080x1920)
                                </button>
                                <button
                                    onClick={() => updateConfig('format', 'square')}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                        config.format === 'square'
                                            ? 'bg-white text-blue-900 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    ⏹️ Square (1:1 - 1080x1080)
                                </button>
                            </div>
                        </div>

                        {/* Theme Swatches */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">
                                Pilihan Tema Warna
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {THEMES.map((th) => {
                                    const isSelected = config.theme === th.id;
                                    return (
                                        <button
                                            key={th.id}
                                            onClick={() => updateConfig('theme', th.id)}
                                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                                                isSelected
                                                    ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${th.bg} border border-slate-300 shrink-0 relative flex items-center justify-center shadow-xs`}>
                                                <div className={`w-2.5 h-2.5 rounded-full ${th.accent}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-bold text-slate-800 block">
                                                    {th.name}
                                                </span>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* 8. SECTION: KUSTOMISASI TEKS & WARNA FONT                */}
            {/* ======================================================== */}
            <div className="flex flex-col">
                <button
                    onClick={() => toggleSection('text')}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-slate-800 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-blue-600" />
                        <span>Kustomisasi Teks & Warna Font</span>
                    </div>
                    {activeSection === 'text' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeSection === 'text' && (
                    <div className="p-4 space-y-4 bg-white">
                        {/* Title Font Color Picker */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Pipette className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Warna Font Judul Utama</span>
                                </label>
                                {config.customTitleColor && (
                                    <button
                                        onClick={() => updateConfig('customTitleColor', '')}
                                        className="text-[10px] text-slate-400 hover:text-blue-600"
                                    >
                                        Reset Warna
                                    </button>
                                )}
                            </div>

                            {/* Color Swatches */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {FONT_COLOR_PRESETS.map((p) => {
                                    const isSel = (config.customTitleColor || '#001f5c') === p.color;
                                    return (
                                        <button
                                            key={p.color}
                                            onClick={() => updateConfig('customTitleColor', p.color)}
                                            className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                                                isSel ? 'border-blue-500 scale-110 shadow-xs' : 'border-slate-300 hover:scale-105'
                                            }`}
                                            style={{ backgroundColor: p.color }}
                                            title={p.name}
                                        >
                                            {isSel && (
                                                <div className={`w-1.5 h-1.5 rounded-full ${p.color === '#ffffff' ? 'bg-slate-800' : 'bg-white'}`} />
                                            )}
                                        </button>
                                    );
                                })}
                                {/* Custom Native Color Input */}
                                <label className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden bg-gradient-to-tr from-rose-400 via-amber-400 to-sky-400" title="Pilih Warna Khusus">
                                    <input
                                        type="color"
                                        value={config.customTitleColor || '#001f5c'}
                                        onChange={(e) => updateConfig('customTitleColor', e.target.value)}
                                        className="opacity-0 w-0 h-0 cursor-pointer"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Schedule Text Color Picker */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Pipette className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Warna Font Jadwal Praktik</span>
                                </label>
                                {config.customScheduleTextColor && (
                                    <button
                                        onClick={() => updateConfig('customScheduleTextColor', '')}
                                        className="text-[10px] text-slate-400 hover:text-emerald-600"
                                    >
                                        Reset Warna
                                    </button>
                                )}
                            </div>

                            {/* Color Swatches */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {FONT_COLOR_PRESETS.map((p) => {
                                    const isSel = (config.customScheduleTextColor || '#001f5c') === p.color;
                                    return (
                                        <button
                                            key={p.color}
                                            onClick={() => updateConfig('customScheduleTextColor', p.color)}
                                            className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                                                isSel ? 'border-emerald-500 scale-110 shadow-xs' : 'border-slate-300 hover:scale-105'
                                            }`}
                                            style={{ backgroundColor: p.color }}
                                            title={p.name}
                                        >
                                            {isSel && (
                                                <div className={`w-1.5 h-1.5 rounded-full ${p.color === '#ffffff' ? 'bg-slate-800' : 'bg-white'}`} />
                                            )}
                                        </button>
                                    );
                                })}
                                {/* Custom Native Color Input */}
                                <label className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden bg-gradient-to-tr from-rose-400 via-amber-400 to-sky-400" title="Pilih Warna Khusus">
                                    <input
                                        type="color"
                                        value={config.customScheduleTextColor || '#001f5c'}
                                        onChange={(e) => updateConfig('customScheduleTextColor', e.target.value)}
                                        className="opacity-0 w-0 h-0 cursor-pointer"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Header Lines */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Header Baris 1
                                </label>
                                <input
                                    type="text"
                                    value={config.headerLine1 || ''}
                                    onChange={(e) => updateConfig('headerLine1', e.target.value)}
                                    placeholder="Jadwal"
                                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Header Baris 2
                                </label>
                                <input
                                    type="text"
                                    value={config.headerLine2 || ''}
                                    onChange={(e) => updateConfig('headerLine2', e.target.value)}
                                    placeholder="Praktik Dokter"
                                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Tag Subtitle */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tag Subtitle Atas
                            </label>
                            <input
                                type="text"
                                value={config.headerTag || ''}
                                onChange={(e) => updateConfig('headerTag', e.target.value)}
                                placeholder="EXECUTIVE CLINIC • RSU SILOAM AMBON"
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Doctor Name */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nama Dokter
                            </label>
                            <input
                                type="text"
                                value={config.customDoctorName || ''}
                                onChange={(e) => updateConfig('customDoctorName', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Specialty */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Spesialisasi
                            </label>
                            <input
                                type="text"
                                value={config.customSpecialty || ''}
                                onChange={(e) => updateConfig('customSpecialty', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Reservation Notice */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Pesan / Informasi Pendaftaran
                            </label>
                            <textarea
                                rows={2}
                                value={config.customNote || ''}
                                onChange={(e) => updateConfig('customNote', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <button
                            onClick={resetToDoctorDefault}
                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold pt-1"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Data Asli Dokter</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* 9. SECTION: TOGGLE ELEMEN BRANDING                       */}
            {/* ======================================================== */}
            <div className="flex flex-col">
                <button
                    onClick={() => toggleSection('toggles')}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-slate-800 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-teal-600" />
                        <span>Tampilan Logo & Status</span>
                    </div>
                    {activeSection === 'toggles' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeSection === 'toggles' && (
                    <div className="p-4 space-y-2.5 bg-white text-xs">
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="font-medium text-slate-700">Logo RSU Siloam</span>
                            <input
                                type="checkbox"
                                checked={config.showLogo}
                                onChange={(e) => updateConfig('showLogo', e.target.checked)}
                                className="h-4 w-4 text-blue-600 rounded"
                            />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="font-medium text-slate-700">Emblem Executive Clinic</span>
                            <input
                                type="checkbox"
                                checked={config.showExecutiveBadge}
                                onChange={(e) => updateConfig('showExecutiveBadge', e.target.checked)}
                                className="h-4 w-4 text-blue-600 rounded"
                            />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="font-medium text-slate-700">Status Cuti (Bila Ada)</span>
                            <input
                                type="checkbox"
                                checked={config.showLeaveBadge}
                                onChange={(e) => updateConfig('showLeaveBadge', e.target.checked)}
                                className="h-4 w-4 text-blue-600 rounded"
                            />
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
};
