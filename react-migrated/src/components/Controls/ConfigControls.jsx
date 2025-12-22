import { useStory } from '../../context/StoryContext';
import { InputGroup, Input, Select } from '../Controls/InputGroup';

export const ConfigControls = () => {
    const { config, updateConfig } = useStory();

    const handleChange = (key, value) => {
        updateConfig(key, value);
    };

    return (
        <div className="p-4 space-y-6 pb-20">
            {/* Format Selection */}
            <InputGroup label="Format Gambar">
                <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio text-blue-600"
                            name="format"
                            checked={config.format === 'story'}
                            onChange={() => handleChange('format', 'story')}
                        />
                        <span className="ml-2">Story (9:16)</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio text-blue-600"
                            name="format"
                            checked={config.format === 'square'}
                            onChange={() => handleChange('format', 'square')}
                        />
                        <span className="ml-2">Feed (1:1)</span>
                    </label>
                </div>
            </InputGroup>

            {/* Background Theme */}
            <InputGroup label="Tema Background" id="theme">
                <Select
                    id="theme"
                    value={config.theme}
                    onChange={(e) => handleChange('theme', e.target.value)}
                >
                    <option value="gradient-blue">Modern Gradient Blue</option>
                    <option value="solid-white">Clean White (Dots)</option>
                    <option value="siloam-white-dots">Siloam White Dots</option>
                    <option value="abstract-mesh">Abstract Mesh</option>
                    <option value="modern-geometric">Modern Geometric</option>
                    <option value="corporate-blue">Corporate Blue (Minimal)</option>
                    <option value="elegant-gold">Elegant Gold (Dark)</option>
                    <option value="modern-clean">Modern Clean</option>
                    <option value="professional-slate">Professional Slate</option>
                    <option value="executive-red">Executive Red</option>
                </Select>
            </InputGroup>

            {/* Custom Texts */}
            <div className="space-y-4 border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-sm uppercase text-slate-500">Teks Header</h3>
                <InputGroup label="Judul Atas (Kecil)" id="headertop">
                    <div className="flex space-x-2">
                        <Input
                            id="headertop"
                            className="flex-grow"
                            placeholder="Text"
                            value={config.headerTop}
                            onChange={(e) => handleChange('headerTop', e.target.value)}
                        />
                        <div className="flex flex-col w-24">
                            <label className="text-xs text-slate-400 mb-1">Size (px)</label>
                            <Input
                                type="number"
                                value={config.headerTopSize}
                                onChange={(e) => handleChange('headerTopSize', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </InputGroup>
                <InputGroup label="Judul Utama (Besar)" id="headermain">
                    <div className="flex space-x-2">
                        <Input
                            id="headermain"
                            className="flex-grow"
                            placeholder="Text"
                            value={config.headerMain}
                            onChange={(e) => handleChange('headerMain', e.target.value)}
                        />
                        <div className="flex flex-col w-24">
                            <label className="text-xs text-slate-400 mb-1">Size (px)</label>
                            <Input
                                type="number"
                                value={config.headerMainSize}
                                onChange={(e) => handleChange('headerMainSize', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </InputGroup>
            </div>

            {/* Font Sizes */}
            <div className="space-y-4 border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-sm uppercase text-slate-500">Ukuran Font</h3>

                <InputGroup label={`Header Scale (${config.headerFontSize}x)`}>
                    <input
                        type="range" min="0.5" max="2" step="0.1"
                        className="w-full"
                        value={config.headerFontSize}
                        onChange={(e) => handleChange('headerFontSize', parseFloat(e.target.value))}
                    />
                </InputGroup>
                <InputGroup label={`Doctor Name Scale (${config.doctorFontSize}x)`}>
                    <input
                        type="range" min="0.8" max="1.5" step="0.05"
                        className="w-full"
                        value={config.doctorFontSize} // Note: This needs to be hooked up in Canvas if used
                        onChange={(e) => handleChange('doctorFontSize', parseFloat(e.target.value))}
                    />
                </InputGroup>
                <InputGroup label={`Date Scale (${config.dateFontSize}x)`}>
                    <input
                        type="range" min="0.8" max="1.5" step="0.05"
                        className="w-full"
                        value={config.dateFontSize}
                        onChange={(e) => handleChange('dateFontSize', parseFloat(e.target.value))}
                    />
                </InputGroup>
            </div>

            {/* Layout Adjustments */}
            <div className="space-y-4 border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-sm uppercase text-slate-500">Tata Letak</h3>

                <InputGroup label="Alignment">
                    <Select
                        value={config.textAlign}
                        onChange={(e) => handleChange('textAlign', e.target.value)}
                    >
                        <option value="center">Tengah (Center)</option>
                        <option value="left">Kiri (Left)</option>
                    </Select>
                </InputGroup>

                <InputGroup label={`Posisi Vertikal Header (${config.headerVerticalPos}px)`}>
                    <input
                        type="range" min="-100" max="100" step="5"
                        className="w-full"
                        value={config.headerVerticalPos}
                        onChange={(e) => handleChange('headerVerticalPos', parseInt(e.target.value))}
                    />
                </InputGroup>

                <InputGroup label={`Jarak Baris Header / Leading (${config.headerSpacing}px)`}>
                    <input
                        type="range" min="-50" max="100" step="2"
                        className="w-full"
                        value={config.headerSpacing}
                        onChange={(e) => handleChange('headerSpacing', parseInt(e.target.value))}
                    />
                </InputGroup>

                <InputGroup label={`Posisi Vertikal List Dokter (${config.verticalPos}px)`}>
                    <input
                        type="range" min="-200" max="200" step="10"
                        className="w-full"
                        value={config.verticalPos}
                        onChange={(e) => handleChange('verticalPos', parseInt(e.target.value))}
                    />
                </InputGroup>

                <InputGroup label={`Jarak Antar Dokter (${config.spacing}px)`}>
                    <input
                        type="range" min="0" max="100" step="4"
                        className="w-full"
                        value={config.spacing}
                        onChange={(e) => handleChange('spacing', parseInt(e.target.value))}
                    />
                </InputGroup>
            </div>

            {/* Custom Logo */}
            <div className="border-t border-slate-200 pt-4">
                <InputGroup label="URL Logo Custom (Opsional)" id="logo">
                    <Input
                        id="logo"
                        placeholder="https://..."
                        value={config.logoUrl}
                        onChange={(e) => handleChange('logoUrl', e.target.value)}
                    />
                </InputGroup>
            </div>

            {/* Custom Message */}
            <div className="border-t border-slate-200 pt-4">
                <InputGroup label="Pesan Tambahan (Opsional)" id="msg">
                    <Input
                        id="msg"
                        placeholder="Contoh: Mohon maaf atas ketidaknyamanan..."
                        value={config.customMessage}
                        onChange={(e) => handleChange('customMessage', e.target.value)}
                    />
                </InputGroup>
            </div>

            {/* Footer Toggle */}
            <div className="flex items-center pt-2">
                <input
                    id="footer"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    checked={config.showFooter}
                    onChange={(e) => handleChange('showFooter', e.target.checked)}
                />
                <label htmlFor="footer" className="ml-2 block text-sm text-slate-900">
                    Tampilkan Footer
                </label>
            </div>
        </div>
    );
};
