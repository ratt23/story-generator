import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../UI/Button';
import { Input } from '../Controls/InputGroup';
import { 
    Loader2, Printer, Eye, ChevronUp, ChevronDown, Sparkles, 
    ArrowUp, ArrowDown, RotateCcw, EyeOff, Layers, User, ChevronRight, FileText,
    Upload, Image as ImageIcon, RefreshCw, Type, Edit3, Save, Check, Download, FolderOpen,
    Sliders, Move, Maximize2, AlignVerticalSpaceAround, Smartphone
} from 'lucide-react';
import { buildBrochureHtml, fetchRegularDoctorGroups } from '../../utils/brochureBuilder';

const STORAGE_KEY = 'regular_brochure_saved_config_v4';

const DEFAULT_TEXT_CONFIG = {
    // Inside Spread Texts
    insideMainTitle: 'Jadwal Poliklinik Dokter Spesialis',
    insideSubtitle: 'Siloam Hospitals Ambon',
    updateDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),

    // Outside Address & Contact
    outsideHospitalName: 'Siloam Hospitals Ambon',
    outsideAddress: 'Jl. Sultan Hasanudin, Hative Kecil, Kec. Sirimau, Kota Ambon, Maluku',
    outsidePhone: 'Telp: (0911) 3911900 / 0812-4040-3900',

    // Outside Cover Texts
    outsideCoverTitle1: 'Jadwal Poliklinik',
    outsideCoverTitle2: 'Dokter Spesialis',
    outsideCoverHospital: 'Siloam Hospitals Ambon',
    outsideCoverYear: '2025/2026'
};

const DEFAULT_LAYOUT_CONFIG = {
    globalScale: 100, // 70% to 130%
    offsetX: 0, // -50px to +50px
    offsetY: 0, // -50px to +50px
    panelPaddingX: 8, // 0 to 20px
    panelPaddingY: 6, // 0 to 20px
    specialtySpacing: 3, // 0 to 15px
    doctorCardSpacing: 2.5, // 0 to 10px
    cardPadding: 3, // 0 to 10px
    
    // Header & Subhead Spacing
    headSubheadGap: 2, // 0 to 20px
    headerMarginBottom: 4, // 0 to 25px
    headerFontSize: 13, // 8 to 22px
    headerSubtitleFontSize: 7.5, // 5 to 14px
    
    // Font Sizes
    titleFontSize: 9.5, // 6 to 16px
    doctorFontSize: 8, // 5 to 14px
    scheduleFontSize: 7, // 4 to 12px

    // Gambar 2 (Cover BG) Controls
    bgScale: 100, // 50% to 250%
    bgOffsetX: 0, // -100px to +100px
    bgOffsetY: 0, // -100px to +100px
    bgOpacity: 88, // 20% to 100%

    // Gambar 3 (Middle Panel Phone Mockup) Controls
    image3Scale: 100, // 50% to 150%
    image3OffsetX: 0, // -50px to +50px
    image3OffsetY: 0, // -50px to +50px

    // Gambar 1 (Front Cover Image) Controls
    coverImageScale: 100, // 50% to 150%
    coverImageOffsetX: 0, // -50px to +50px
    coverImageOffsetY: 0 // -50px to +50px
};

export const BrochureGenerator = () => {
    const [showControls, setShowControls] = useState(true);
    const [coverUrl, setCoverUrl] = useState('asset/brochure/1.png');
    const [bgUrl, setBgUrl] = useState('asset/brochure/2.png');
    const [logoUrl, setLogoUrl] = useState('/asset/logo/logo.png');
    const [image3Url, setImage3Url] = useState('/asset/brochure/3.png');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ msg: 'Sistem siap. Edit teks, layout & susunan dokter di bawah.', isError: false });
    const [previewHtml, setPreviewHtml] = useState(null);
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const coverInputRef = useRef(null);
    const bgInputRef = useRef(null);
    const logoInputRef = useRef(null);
    const image3InputRef = useRef(null);
    const importPresetInputRef = useRef(null);

    // Active Sidebar Sub-Tab: 'layout' | 'media_tuning' | 'text' | 'order' | 'media'
    const [activeTab, setActiveTab] = useState('layout');

    // Editable Text Configuration State
    const [textConfig, setTextConfig] = useState(DEFAULT_TEXT_CONFIG);

    // Layout & Spacing Tuning Configuration State
    const [layoutConfig, setLayoutConfig] = useState(DEFAULT_LAYOUT_CONFIG);

    // Specialty & Doctor Reordering State
    const [specialtyGroups, setSpecialtyGroups] = useState([]);
    const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());
    const [initialLoading, setInitialLoading] = useState(true);

    // Fetch initial doctor groups from DB or localStorage
    const loadDoctorGroups = useCallback(async (forceDefault = false) => {
        try {
            setLoading(true);

            // Check saved config in localStorage if not forcing default
            if (!forceDefault) {
                const savedJson = localStorage.getItem(STORAGE_KEY);
                if (savedJson) {
                    try {
                        const saved = JSON.parse(savedJson);
                        if (saved.textConfig) setTextConfig(saved.textConfig);
                        if (saved.layoutConfig) setLayoutConfig(saved.layoutConfig);
                        if (saved.coverUrl) setCoverUrl(saved.coverUrl);
                        if (saved.bgUrl) setBgUrl(saved.bgUrl);
                        if (saved.logoUrl) setLogoUrl(saved.logoUrl);
                        if (saved.image3Url) setImage3Url(saved.image3Url);
                        if (saved.savedAt) setLastSavedTime(saved.savedAt);

                        if (saved.specialtyGroups && saved.specialtyGroups.length > 0) {
                            setSpecialtyGroups(saved.specialtyGroups);
                            setExpandedGroupIds(new Set([saved.specialtyGroups[0].id, saved.specialtyGroups[1]?.id].filter(Boolean)));
                            setStatus({ msg: `💾 Memuat konfigurasi tersimpan (${saved.savedAt})`, isError: false });
                            return saved.specialtyGroups;
                        }
                    } catch (e) {
                        console.warn('[BrochureGenerator] Failed to parse saved config:', e);
                    }
                }
            }

            // Fresh load from DB
            const groups = await fetchRegularDoctorGroups();
            setSpecialtyGroups(groups);
            if (groups.length > 0) {
                setExpandedGroupIds(new Set([groups[0].id, groups[1]?.id].filter(Boolean)));
            }
            if (forceDefault) {
                setTextConfig(DEFAULT_TEXT_CONFIG);
                setLayoutConfig(DEFAULT_LAYOUT_CONFIG);
                setCoverUrl('asset/brochure/1.png');
                setBgUrl('asset/brochure/2.png');
                setLogoUrl('/asset/logo/logo.png');
                setImage3Url('/asset/brochure/3.png');
                localStorage.removeItem(STORAGE_KEY);
                setLastSavedTime(null);
                setStatus({ msg: '🔄 Konfigurasi & urutan dokter di-reset ke default database.', isError: false });
            }
            return groups;
        } catch (err) {
            console.error('[BrochureGenerator] Failed to load groups:', err);
            setStatus({ msg: `❌ Gagal memuat data dokter: ${err.message}`, isError: true });
            return [];
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, []);

    // Generate brochure HTML (Preview / Print)
    const generateBrochure = useCallback(async (
        action = 'preview', 
        groupsToUse = null, 
        overrideCover = null,
        overrideBg = null,
        overrideLogo = null,
        overrideTextConfig = null,
        overrideLayoutConfig = null
    ) => {
        setLoading(true);
        setStatus({ msg: '🔄 Memproses brosur...', isError: false });

        let printWindow = null;
        if (action === 'print') {
            printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Memuat Brosur Trifold...</title></head>
                    <body style="font-family: 'Poppins', sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#f8fafc; color:#1e293b;">
                        <div style="text-align:center;">
                            <div style="font-size:24px; font-weight:700; color:#1e3a8a; margin-bottom:8px;">RSU SILOAM AMBON</div>
                            <div style="font-size:16px; color:#475569;">Menyiapkan dokumen cetak brosur reguler...</div>
                        </div>
                    </body>
                    </html>
                `);
            }
        }

        try {
            const currentGroups = groupsToUse || specialtyGroups;
            const currentTexts = overrideTextConfig || textConfig;
            const currentLayout = overrideLayoutConfig || layoutConfig;

            const htmlContent = await buildBrochureHtml({
                type: 'regular',
                customGroups: currentGroups.length > 0 ? currentGroups : null,
                textConfig: currentTexts,
                layoutConfig: currentLayout,
                coverUrl: overrideCover || coverUrl || 'asset/brochure/1.png',
                bgUrl: overrideBg || bgUrl || 'asset/brochure/2.png',
                logoUrl: overrideLogo || logoUrl || '/asset/logo/logo.png',
                image3Url: image3Url || '/asset/brochure/3.png'
            });

            if (action === 'preview') {
                setPreviewHtml(htmlContent);
                setStatus({ msg: '✨ Preview brosur berhasil diperbarui', isError: false });
            } else {
                if (printWindow) {
                    // Inject <base href> so all relative URLs (/asset/...) resolve from the dev server
                    const baseUrl = window.location.origin;
                    const htmlWithBase = htmlContent.replace('<head>', `<head><base href="${baseUrl}/">`);
                    printWindow.document.open();
                    printWindow.document.write(htmlWithBase);
                    printWindow.document.close();
                    setStatus({ msg: '🎉 Tab cetak berhasil dibuka (Siap Print / Save as PDF).', isError: false });
                } else {
                    throw new Error('Pop-up terblokir oleh browser. Izinkan pop-up untuk mencetak.');
                }
            }
        } catch (error) {
            console.error('[BrochureGenerator] Error generating:', error);
            setStatus({ msg: `❌ Error: ${error.message}`, isError: true });
            if (printWindow) {
                printWindow.document.body.innerHTML = `
                    <div style="padding:40px; color:#dc2626; font-family:sans-serif; text-align:center;">
                        <h2>Gagal Memuat Brosur</h2>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        } finally {
            setLoading(false);
        }
    }, [specialtyGroups, textConfig, layoutConfig, coverUrl, bgUrl, logoUrl, image3Url]);

    // Initial load & automatic preview render
    useEffect(() => {
        (async () => {
            const groups = await loadDoctorGroups();
            if (groups.length > 0) {
                generateBrochure('preview', groups);
            }
        })();
    }, []);

    // Save configuration
    const handleSaveConfig = () => {
        try {
            const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            const dataToSave = {
                textConfig,
                layoutConfig,
                specialtyGroups,
                coverUrl,
                bgUrl,
                logoUrl,
                image3Url,
                savedAt: nowStr
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            setLastSavedTime(nowStr);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
            setStatus({ msg: `💾 Perubahan berhasil disimpan! (${nowStr})`, isError: false });
        } catch (err) {
            console.error('[BrochureGenerator] Error saving config:', err);
            setStatus({ msg: `❌ Gagal menyimpan konfigurasi: ${err.message}`, isError: true });
        }
    };

    // Export Preset JSON
    const handleExportPreset = () => {
        const dataToSave = {
            textConfig,
            layoutConfig,
            specialtyGroups,
            coverUrl,
            bgUrl,
            logoUrl,
            image3Url,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `regular-brochure-config-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import Preset JSON
    const handleImportPreset = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result);
                if (parsed.textConfig) setTextConfig(parsed.textConfig);
                if (parsed.layoutConfig) setLayoutConfig(parsed.layoutConfig);
                if (parsed.coverUrl) setCoverUrl(parsed.coverUrl);
                if (parsed.bgUrl) setBgUrl(parsed.bgUrl);
                if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
                if (parsed.image3Url) setImage3Url(parsed.image3Url);
                if (parsed.specialtyGroups) setSpecialtyGroups(parsed.specialtyGroups);

                generateBrochure('preview', parsed.specialtyGroups, parsed.coverUrl, parsed.bgUrl, parsed.logoUrl, parsed.textConfig, parsed.layoutConfig);
                setStatus({ msg: '📥 Preset berhasil diimpor & dimuat!', isError: false });
            } catch (err) {
                setStatus({ msg: `❌ Gagal membaca file JSON preset: ${err.message}`, isError: true });
            }
        };
        reader.readAsText(file);
    };

    // Update single text config field with live preview
    const updateText = (key, value) => {
        const nextTexts = { ...textConfig, [key]: value };
        setTextConfig(nextTexts);
        generateBrochure('preview', null, null, null, null, nextTexts);
    };

    // Update single layout config field with live preview
    const updateLayout = (key, value) => {
        const nextLayout = { ...layoutConfig, [key]: Number(value) };
        setLayoutConfig(nextLayout);
        generateBrochure('preview', null, null, null, null, null, nextLayout);
    };

    // Reset Layout Only
    const handleResetLayout = () => {
        setLayoutConfig(DEFAULT_LAYOUT_CONFIG);
        generateBrochure('preview', null, null, null, null, null, DEFAULT_LAYOUT_CONFIG);
        setStatus({ msg: '📐 Tata letak, posisi gambar & spacing di-reset ke default.', isError: false });
    };

    // File Upload Handlers
    const handleFileUpload = (e, setter, key) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result;
            if (dataUrl) {
                setter(dataUrl);
                if (key === 'cover') generateBrochure('preview', null, dataUrl);
                else if (key === 'bg') generateBrochure('preview', null, null, dataUrl);
                else if (key === 'logo') generateBrochure('preview', null, null, null, dataUrl);
                else generateBrochure('preview');
                setStatus({ msg: `🖼️ Gambar ${key} kustom berhasil diupload!`, isError: false });
            }
        };
        reader.readAsDataURL(file);
    };

    // Reordering: Move Specialty Up / Down
    const moveSpecialty = (index, direction) => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= specialtyGroups.length) return;

        const updated = [...specialtyGroups];
        const [movedItem] = updated.splice(index, 1);
        updated.splice(newIndex, 0, movedItem);

        setSpecialtyGroups(updated);
        generateBrochure('preview', updated);
    };

    // Reordering: Move Doctor inside Specialty Up / Down
    const moveDoctor = (groupIndex, docIndex, direction) => {
        const group = specialtyGroups[groupIndex];
        if (!group || !group.doctors) return;

        const newDocIndex = direction === 'up' ? docIndex - 1 : docIndex + 1;
        if (newDocIndex < 0 || newDocIndex >= group.doctors.length) return;

        const updatedDoctors = [...group.doctors];
        const [movedDoc] = updatedDoctors.splice(docIndex, 1);
        updatedDoctors.splice(newDocIndex, 0, movedDoc);

        const updatedGroups = [...specialtyGroups];
        updatedGroups[groupIndex] = {
            ...group,
            doctors: updatedDoctors
        };

        setSpecialtyGroups(updatedGroups);
        generateBrochure('preview', updatedGroups);
    };

    // Toggle Doctor Visibility
    const toggleDoctorVisibility = (groupIndex, docIndex) => {
        const group = specialtyGroups[groupIndex];
        if (!group || !group.doctors) return;

        const updatedDoctors = [...group.doctors];
        const currentVis = updatedDoctors[docIndex].visible !== false;
        updatedDoctors[docIndex] = {
            ...updatedDoctors[docIndex],
            visible: !currentVis
        };

        const updatedGroups = [...specialtyGroups];
        updatedGroups[groupIndex] = {
            ...group,
            doctors: updatedDoctors
        };

        setSpecialtyGroups(updatedGroups);
        generateBrochure('preview', updatedGroups);
    };

    // Accordion Toggle
    const toggleAccordion = (groupId) => {
        setExpandedGroupIds(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const handleResetAll = async () => {
        if (window.confirm('Reset seluruh konfigurasi (teks, layout, logo, dan susunan dokter) ke default database?')) {
            const defaultGroups = await loadDoctorGroups(true);
            generateBrochure('preview', defaultGroups, 'asset/brochure/1.png', 'asset/brochure/2.png', '/asset/logo/logo.png', DEFAULT_TEXT_CONFIG, DEFAULT_LAYOUT_CONFIG);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden font-sans">
            {/* Mobile Toggle Bar */}
            <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center z-30 sticky top-0">
                <span className="font-bold text-slate-700">Brochure Generator (Trifold A4)</span>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowControls(!showControls)}
                >
                    {showControls ? <ChevronUp /> : <ChevronDown />}
                </Button>
            </div>

            {/* Sidebar Controls */}
            <div className={`${showControls ? 'block' : 'hidden'} md:block w-full md:w-96 bg-white p-5 shadow-lg border-r border-slate-200 overflow-y-auto z-20 flex-shrink-0 transition-all`}>
                <div className="mb-4 hidden md:block">
                    <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            <span>Trifold A4 (Lipat Tiga)</span>
                        </div>
                        {lastSavedTime && (
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <Check className="w-2.5 h-2.5" /> Tersimpan
                            </span>
                        )}
                    </div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight mt-1.5">
                        Generator Brosur Reguler
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                        Kustomisasi teks, posisi gambar, tata letak & dokter.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold text-xs py-2 shadow-sm flex items-center justify-center gap-1.5"
                                onClick={() => generateBrochure('preview')}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                Preview
                            </Button>
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 shadow-sm flex items-center justify-center gap-1.5"
                                onClick={() => generateBrochure('print')}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
                                Cetak Brosur
                            </Button>
                        </div>

                        {/* SAVE BUTTON */}
                        <Button
                            className={`w-full text-white font-bold text-xs py-2 shadow-sm flex items-center justify-center gap-2 transition-all ${
                                saveSuccess
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-blue-700 hover:bg-blue-800'
                            }`}
                            onClick={handleSaveConfig}
                        >
                            {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            <span>{saveSuccess ? 'Perubahan Tersimpan!' : 'Simpan Perubahan (Save)'}</span>
                        </Button>
                    </div>

                    {/* Status Message */}
                    <div className={`p-2.5 border rounded-lg text-center text-xs ${status.isError ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {status.msg}
                    </div>

                    {/* Navigation Tabs (5 Tabs) */}
                    <div className="grid grid-cols-5 border-b border-slate-200 text-[10px] font-bold text-center">
                        <button
                            onClick={() => setActiveTab('layout')}
                            className={`py-2 flex flex-col items-center justify-center gap-0.5 border-b-2 transition-colors ${
                                activeTab === 'layout'
                                    ? 'border-blue-600 text-blue-800 bg-blue-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Layout</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('media_tuning')}
                            className={`py-2 flex flex-col items-center justify-center gap-0.5 border-b-2 transition-colors ${
                                activeTab === 'media_tuning'
                                    ? 'border-blue-600 text-blue-800 bg-blue-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Move className="w-3.5 h-3.5" />
                            <span>Gambar</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('text')}
                            className={`py-2 flex flex-col items-center justify-center gap-0.5 border-b-2 transition-colors ${
                                activeTab === 'text'
                                    ? 'border-blue-600 text-blue-800 bg-blue-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Type className="w-3.5 h-3.5" />
                            <span>Teks</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('order')}
                            className={`py-2 flex flex-col items-center justify-center gap-0.5 border-b-2 transition-colors ${
                                activeTab === 'order'
                                    ? 'border-blue-600 text-blue-800 bg-blue-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Urutan</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('media')}
                            className={`py-2 flex flex-col items-center justify-center gap-0.5 border-b-2 transition-colors ${
                                activeTab === 'media'
                                    ? 'border-blue-600 text-blue-800 bg-blue-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Upload</span>
                        </button>
                    </div>

                    {/* ========================================================= */}
                    {/* TAB 1: LAYOUT & SPACING CONTROLS */}
                    {/* ========================================================= */}
                    {activeTab === 'layout' && (
                        <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Pengaturan Tata Letak & Spacing
                                </span>
                                <button
                                    onClick={handleResetLayout}
                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                                >
                                    <RotateCcw className="w-2.5 h-2.5" /> Reset
                                </button>
                            </div>

                            {/* Spacing Header & Subhead */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                    <AlignVerticalSpaceAround className="w-3.5 h-3.5 text-blue-600" />
                                    <h4 className="font-bold text-slate-800 text-xs">
                                        Jarak Head & Sub-head
                                    </h4>
                                </div>

                                {/* Jarak Antara Judul (Head) dan Tanggal (Sub-head) */}
                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Jarak Head ke Sub-head:</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.headSubheadGap} px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="20"
                                        step="0.5"
                                        value={layoutConfig.headSubheadGap}
                                        onChange={(e) => updateLayout('headSubheadGap', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                {/* Jarak Antara Sub-head ke Jadwal Dokter Pertama */}
                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Jarak Sub-head ke Jadwal:</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.headerMarginBottom} px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="25"
                                        step="1"
                                        value={layoutConfig.headerMarginBottom}
                                        onChange={(e) => updateLayout('headerMarginBottom', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Font Judul Utama</label>
                                        <input
                                            type="number"
                                            min="8"
                                            max="22"
                                            step="0.5"
                                            value={layoutConfig.headerFontSize}
                                            onChange={(e) => updateLayout('headerFontSize', e.target.value)}
                                            className="w-full text-xs p-1 rounded border border-slate-200 text-center"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Font Subtitle</label>
                                        <input
                                            type="number"
                                            min="5"
                                            max="14"
                                            step="0.5"
                                            value={layoutConfig.headerSubtitleFontSize}
                                            onChange={(e) => updateLayout('headerSubtitleFontSize', e.target.value)}
                                            className="w-full text-xs p-1 rounded border border-slate-200 text-center"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Scale & Posisi Halaman */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                    <Move className="w-3.5 h-3.5 text-blue-600" />
                                    <h4 className="font-bold text-slate-800 text-xs">
                                        Posisi Halaman & Skala (Scale Semua)
                                    </h4>
                                </div>

                                {/* Scale Semua */}
                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Skala Keseluruhan (Scale):</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.globalScale}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="75"
                                        max="125"
                                        step="1"
                                        value={layoutConfig.globalScale}
                                        onChange={(e) => updateLayout('globalScale', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                {/* Geser X */}
                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Geser Horizontal (X):</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.offsetX} px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-40"
                                        max="40"
                                        step="1"
                                        value={layoutConfig.offsetX}
                                        onChange={(e) => updateLayout('offsetX', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                {/* Geser Y */}
                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Geser Vertikal (Y):</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.offsetY} px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-40"
                                        max="40"
                                        step="1"
                                        value={layoutConfig.offsetY}
                                        onChange={(e) => updateLayout('offsetY', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            </div>

                            {/* Spacing Antar Dokter & Spesialis */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                    <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                                    <h4 className="font-bold text-slate-800 text-xs">
                                        Spacing Jadwal Dokter
                                    </h4>
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Jarak Antar Spesialis:</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.specialtySpacing} px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="15"
                                        step="0.5"
                                        value={layoutConfig.specialtySpacing}
                                        onChange={(e) => updateLayout('specialtySpacing', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Jarak Antar Kartu Dokter:</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.doctorCardSpacing} px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="0.5"
                                        value={layoutConfig.doctorCardSpacing}
                                        onChange={(e) => updateLayout('doctorCardSpacing', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 pt-1">
                                    <div>
                                        <label className="text-[9px] font-semibold text-slate-600 block mb-0.5">Judul Spesialis</label>
                                        <input
                                            type="number"
                                            min="6"
                                            max="16"
                                            step="0.5"
                                            value={layoutConfig.titleFontSize}
                                            onChange={(e) => updateLayout('titleFontSize', e.target.value)}
                                            className="w-full text-xs p-1 rounded border border-slate-200 text-center"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-semibold text-slate-600 block mb-0.5">Nama Dokter</label>
                                        <input
                                            type="number"
                                            min="5"
                                            max="14"
                                            step="0.5"
                                            value={layoutConfig.doctorFontSize}
                                            onChange={(e) => updateLayout('doctorFontSize', e.target.value)}
                                            className="w-full text-xs p-1 rounded border border-slate-200 text-center"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-semibold text-slate-600 block mb-0.5">Jam Praktik</label>
                                        <input
                                            type="number"
                                            min="4"
                                            max="12"
                                            step="0.5"
                                            value={layoutConfig.scheduleFontSize}
                                            onChange={(e) => updateLayout('scheduleFontSize', e.target.value)}
                                            className="w-full text-xs p-1 rounded border border-slate-200 text-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 2: IMAGE POSITIONING & SCALE TUNING (Gambar 1, 2, 3) */}
                    {/* ========================================================= */}
                    {activeTab === 'media_tuning' && (
                        <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Posisi & Skala Gambar
                                </span>
                                <button
                                    onClick={handleResetLayout}
                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                                >
                                    <RotateCcw className="w-2.5 h-2.5" /> Reset
                                </button>
                            </div>

                            {/* GAMBAR 2 (Background Cover 2.png) */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                                    <h4 className="font-bold text-slate-800 text-xs">
                                        Gambar 2 (Background Cover)
                                    </h4>
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Skala Background (Zoom):</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.bgScale}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="250"
                                        step="5"
                                        value={layoutConfig.bgScale}
                                        onChange={(e) => updateLayout('bgScale', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Geser Horizontal (X):</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.bgOffsetX} px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-100"
                                        max="100"
                                        step="2"
                                        value={layoutConfig.bgOffsetX}
                                        onChange={(e) => updateLayout('bgOffsetX', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Geser Vertikal (Y):</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.bgOffsetY} px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-100"
                                        max="100"
                                        step="2"
                                        value={layoutConfig.bgOffsetY}
                                        onChange={(e) => updateLayout('bgOffsetY', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Kecerahan / Opacity Overlay:</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.bgOpacity}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="20"
                                        max="100"
                                        step="2"
                                        value={layoutConfig.bgOpacity}
                                        onChange={(e) => updateLayout('bgOpacity', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            </div>

                            {/* GAMBAR 3 (Phone Mockup 3.png - Panel Tengah) */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                                    <h4 className="font-bold text-slate-800 text-xs">
                                        Gambar 3 (Mockup HP - Panel Tengah)
                                    </h4>
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Skala Gambar 3 (Scale):</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.image3Scale}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="150"
                                        step="2"
                                        value={layoutConfig.image3Scale}
                                        onChange={(e) => updateLayout('image3Scale', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Geser Horizontal (X):</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.image3OffsetX} px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-60"
                                        max="60"
                                        step="2"
                                        value={layoutConfig.image3OffsetX}
                                        onChange={(e) => updateLayout('image3OffsetX', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Geser Vertikal (Y):</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.image3OffsetY} px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-60"
                                        max="60"
                                        step="2"
                                        value={layoutConfig.image3OffsetY}
                                        onChange={(e) => updateLayout('image3OffsetY', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            </div>

                            {/* GAMBAR 1 (Cover Image 1.png) */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                    <h4 className="font-bold text-slate-800 text-xs">
                                        Gambar 1 (Cover Depan)
                                    </h4>
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                        <span>Skala Cover (Scale):</span>
                                        <span className="text-blue-600 font-bold">{layoutConfig.coverImageScale}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="150"
                                        step="2"
                                        value={layoutConfig.coverImageScale}
                                        onChange={(e) => updateLayout('coverImageScale', e.target.value)}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Geser X (px)</label>
                                        <input
                                            type="number"
                                            min="-50"
                                            max="50"
                                            value={layoutConfig.coverImageOffsetX}
                                            onChange={(e) => updateLayout('coverImageOffsetX', e.target.value)}
                                            className="w-full text-xs p-1 rounded border border-slate-200 text-center"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Geser Y (px)</label>
                                        <input
                                            type="number"
                                            min="-50"
                                            max="50"
                                            value={layoutConfig.coverImageOffsetY}
                                            onChange={(e) => updateLayout('coverImageOffsetY', e.target.value)}
                                            className="w-full text-xs p-1 rounded border border-slate-200 text-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 3: EDITABLE TEXTS SECTION */}
                    {/* ========================================================= */}
                    {activeTab === 'text' && (
                        <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
                            {/* Halaman Dalam (Inside Spread) Texts */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                                        Teks Halaman Dalam
                                    </h4>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Judul Utama Halaman Dalam</label>
                                        <Input
                                            value={textConfig.insideMainTitle}
                                            onChange={(e) => updateText('insideMainTitle', e.target.value)}
                                            className="text-xs h-8"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Nama RS (Header)</label>
                                            <Input
                                                value={textConfig.insideSubtitle}
                                                onChange={(e) => updateText('insideSubtitle', e.target.value)}
                                                className="text-xs h-8"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Tanggal Update</label>
                                            <Input
                                                value={textConfig.updateDate}
                                                onChange={(e) => updateText('updateDate', e.target.value)}
                                                className="text-xs h-8"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cover Luar (Outside Cover) Texts */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                                        Teks Cover Luar (Panel Kanan)
                                    </h4>
                                </div>
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Judul Cover Baris 1</label>
                                            <Input
                                                value={textConfig.outsideCoverTitle1}
                                                onChange={(e) => updateText('outsideCoverTitle1', e.target.value)}
                                                className="text-xs h-8"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Judul Cover Baris 2</label>
                                            <Input
                                                value={textConfig.outsideCoverTitle2}
                                                onChange={(e) => updateText('outsideCoverTitle2', e.target.value)}
                                                className="text-xs h-8"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Nama RS (Cover)</label>
                                            <Input
                                                value={textConfig.outsideCoverHospital}
                                                onChange={(e) => updateText('outsideCoverHospital', e.target.value)}
                                                className="text-xs h-8"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Teks Tahun</label>
                                            <Input
                                                value={textConfig.outsideCoverYear}
                                                onChange={(e) => updateText('outsideCoverYear', e.target.value)}
                                                className="text-xs h-8"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alamat & Kontak (Panel Tengah Luar) */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                                        Alamat & Kontak (Panel Tengah)
                                    </h4>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Nama RS</label>
                                        <Input
                                            value={textConfig.outsideHospitalName}
                                            onChange={(e) => updateText('outsideHospitalName', e.target.value)}
                                            className="text-xs h-8"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Alamat Lengkap</label>
                                        <textarea
                                            value={textConfig.outsideAddress}
                                            onChange={(e) => updateText('outsideAddress', e.target.value)}
                                            rows={2}
                                            className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Nomor Telepon / Hotline</label>
                                        <Input
                                            value={textConfig.outsidePhone}
                                            onChange={(e) => updateText('outsidePhone', e.target.value)}
                                            className="text-xs h-8"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 4: REORDERING SECTION */}
                    {/* ========================================================= */}
                    {activeTab === 'order' && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-blue-600" />
                                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                                        Urutan Spesialisasi ({specialtyGroups.length})
                                    </h3>
                                </div>
                                <button
                                    onClick={loadDoctorGroups}
                                    title="Reset Urutan ke Default Database"
                                    className="text-[11px] text-slate-500 hover:text-blue-700 font-semibold flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs hover:border-blue-300 transition-colors"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reset</span>
                                </button>
                            </div>

                            {initialLoading ? (
                                <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    <span>Memuat daftar dokter...</span>
                                </div>
                            ) : specialtyGroups.length === 0 ? (
                                <div className="py-4 text-center text-slate-400 text-xs">
                                    Tidak ada data dokter.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                                    {specialtyGroups.map((group, gIdx) => {
                                        const isExpanded = expandedGroupIds.has(group.id);
                                        const visibleDocCount = (group.doctors || []).filter(d => d.visible !== false).length;

                                        return (
                                            <div
                                                key={group.id || gIdx}
                                                className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs transition-all hover:border-slate-300"
                                            >
                                                <div className="p-2 flex items-center justify-between gap-1.5 bg-slate-50/70 border-b border-slate-100">
                                                    <button
                                                        onClick={() => toggleAccordion(group.id)}
                                                        className="flex-1 flex items-center gap-1.5 text-left min-w-0 font-bold text-slate-800 text-xs hover:text-blue-900"
                                                    >
                                                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-blue-600' : ''}`} />
                                                        <span className="truncate">{group.title}</span>
                                                        <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full">
                                                            {visibleDocCount}
                                                        </span>
                                                    </button>

                                                    <div className="flex items-center gap-0.5">
                                                        <button
                                                            onClick={() => moveSpecialty(gIdx, 'up')}
                                                            disabled={gIdx === 0}
                                                            title="Pindah Spesialisasi ke Atas"
                                                            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-20 disabled:hover:bg-transparent"
                                                        >
                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => moveSpecialty(gIdx, 'down')}
                                                            disabled={gIdx === specialtyGroups.length - 1}
                                                            title="Pindah Spesialisasi ke Bawah"
                                                            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-20 disabled:hover:bg-transparent"
                                                        >
                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="p-1.5 space-y-1 bg-white">
                                                        {(group.doctors || []).map((doc, dIdx) => {
                                                            const isVisible = doc.visible !== false;
                                                            return (
                                                                <div
                                                                    key={doc.id || dIdx}
                                                                    className={`flex items-center justify-between p-1.5 rounded border text-xs gap-1.5 transition-colors ${
                                                                        isVisible ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-200 opacity-50'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                        <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                                        <span className="truncate font-medium text-[11px] text-slate-800" title={doc.name}>
                                                                            {doc.name}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-0.5">
                                                                        <button
                                                                            onClick={() => toggleDoctorVisibility(gIdx, dIdx)}
                                                                            title={isVisible ? 'Sembunyikan dokter' : 'Tampilkan dokter'}
                                                                            className={`p-1 rounded text-xs ${isVisible ? 'text-slate-400 hover:text-slate-700' : 'text-blue-700 bg-blue-50'}`}
                                                                        >
                                                                            {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => moveDoctor(gIdx, dIdx, 'up')}
                                                                            disabled={dIdx === 0}
                                                                            title="Pindah Dokter ke Atas"
                                                                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-20"
                                                                        >
                                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => moveDoctor(gIdx, dIdx, 'down')}
                                                                            disabled={dIdx === group.doctors.length - 1}
                                                                            title="Pindah Dokter ke Bawah"
                                                                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-20"
                                                                        >
                                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 5: MEDIA UPLOAD */}
                    {/* ========================================================= */}
                    {activeTab === 'media' && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                            {/* Logo */}
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                                <span className="font-semibold text-xs text-slate-800 block">Logo Siloam</span>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-16 h-12 rounded border border-slate-200 bg-slate-50 flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                                        <img 
                                            src={logoUrl} 
                                            alt="Logo Preview" 
                                            className="max-w-full max-h-full object-contain"
                                            onError={(e) => { e.currentTarget.src = '/asset/logo/logo.png'; }}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <input
                                            type="file"
                                            ref={logoInputRef}
                                            onChange={(e) => handleFileUpload(e, setLogoUrl, 'logo')}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-[11px] py-1 h-7 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border-slate-300"
                                            onClick={() => logoInputRef.current?.click()}
                                        >
                                            <Upload className="w-3 h-3 text-slate-600" />
                                            <span>Upload Logo</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Gambar Cover (1.png) */}
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                                <span className="font-semibold text-xs text-slate-800 block">Gambar Cover Depan (1.png)</span>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-16 h-12 rounded border border-slate-200 bg-slate-50 flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0">
                                        <img 
                                            src={coverUrl} 
                                            alt="Cover Preview" 
                                            className="w-full h-full object-cover rounded"
                                            onError={(e) => { e.currentTarget.src = '/asset/brochure/1.png'; }}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <input
                                            type="file"
                                            ref={coverInputRef}
                                            onChange={(e) => handleFileUpload(e, setCoverUrl, 'cover')}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-[11px] py-1 h-7 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border-slate-300"
                                            onClick={() => coverInputRef.current?.click()}
                                        >
                                            <Upload className="w-3 h-3 text-slate-600" />
                                            <span>Upload Cover</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Background Cover (2.png) */}
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                                <span className="font-semibold text-xs text-slate-800 block">Background Cover (2.png)</span>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-16 h-12 rounded border border-slate-200 bg-slate-50 flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0">
                                        <img 
                                            src={bgUrl} 
                                            alt="BG Preview" 
                                            className="w-full h-full object-cover rounded"
                                            onError={(e) => { e.currentTarget.src = '/asset/brochure/2.png'; }}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <input
                                            type="file"
                                            ref={bgInputRef}
                                            onChange={(e) => handleFileUpload(e, setBgUrl, 'bg')}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-[11px] py-1 h-7 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border-slate-300"
                                            onClick={() => bgInputRef.current?.click()}
                                        >
                                            <Upload className="w-3 h-3 text-slate-600" />
                                            <span>Upload Background</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Gambar Tambahan (3.png) */}
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                                <span className="font-semibold text-xs text-slate-800 block">Gambar Tambahan Luar (3.png)</span>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-16 h-12 rounded border border-slate-200 bg-slate-50 flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0">
                                        <img 
                                            src={image3Url} 
                                            alt="Image 3 Preview" 
                                            className="w-full h-full object-contain rounded"
                                            onError={(e) => { e.currentTarget.src = '/asset/brochure/3.png'; }}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <input
                                            type="file"
                                            ref={image3InputRef}
                                            onChange={(e) => handleFileUpload(e, setImage3Url, 'image3')}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-[11px] py-1 h-7 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border-slate-300"
                                            onClick={() => image3InputRef.current?.click()}
                                        >
                                            <Upload className="w-3 h-3 text-slate-600" />
                                            <span>Upload Gambar 3</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PRESET BACKUP & RESET ACTIONS */}
                    <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs">
                        <input
                            type="file"
                            ref={importPresetInputRef}
                            onChange={handleImportPreset}
                            accept="application/json"
                            className="hidden"
                        />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportPreset}
                                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px] font-medium"
                                title="Export Konfigurasi ke file JSON"
                            >
                                <Download className="w-3 h-3" /> Export
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                                onClick={() => importPresetInputRef.current?.click()}
                                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px] font-medium"
                                title="Import Konfigurasi dari file JSON"
                            >
                                <FolderOpen className="w-3 h-3" /> Import
                            </button>
                        </div>
                        <button
                            onClick={handleResetAll}
                            className="text-red-500 hover:text-red-700 text-[11px] font-semibold flex items-center gap-0.5"
                            title="Reset Semua ke Default Database"
                        >
                            <RotateCcw className="w-3 h-3" /> Reset Semua
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Area (Trifold A4) — Using iframe for isolated rendering */}
            {/* iframe prevents template HTML (<html>, <head>, @page rules, Google Fonts) from */}
            {/* leaking into the React DOM and causing zoom/style bleed issues.              */}
            <div className="flex-1 bg-slate-200 overflow-auto relative">
                <div className="w-fit min-w-full min-h-full flex justify-center py-8 px-4">
                    {previewHtml ? (
                        <iframe
                            srcDoc={previewHtml}
                            title="Preview Brosur Reguler"
                            style={{
                                width: '297mm',
                                height: '470mm',
                                border: 'none',
                                background: 'white',
                                display: 'block',
                                flexShrink: 0,
                                borderRadius: '4px',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.18)'
                            }}
                            scrolling="yes"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-[210mm] text-slate-400">
                            <div className="text-center">
                                <FileText className="w-12 h-12 mb-3 text-slate-400 mx-auto" />
                                <p className="text-lg font-medium text-slate-700">Preview Area Brosur Reguler</p>
                                <p className="text-sm text-slate-500 mt-1">Klik tombol "Preview" untuk memuat</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
