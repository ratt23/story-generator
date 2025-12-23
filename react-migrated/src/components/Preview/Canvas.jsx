import { useStory } from '../../context/StoryContext';
import { useFetchDoctors } from '../../hooks/useFetchDoctors';
import { formatFullDate } from '../../utils/helpers';
import clsx from 'clsx';

export const Canvas = () => {
    const { config, selectedDoctorIds } = useStory();
    const { doctors } = useFetchDoctors();

    const selectedDoctors = selectedDoctorIds
        .map(id => doctors.find(d => d.id === id))
        .filter(Boolean);

    // Sort Logic
    // Sort logic (Match vanilla: Name ASC then Date ASC)
    // Sort logic (Match vanilla: Name ASC then Date ASC)
    const sortedDoctors = [...selectedDoctors].sort((a, b) => {
        const nameA = a.nama.toLowerCase();
        const nameB = b.nama.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        // Date sort fallback (Numeric comparison)
        const parseDateVal = (dateStr) => {
            if (!dateStr) return 0;
            const parts = dateStr.split('-').map(Number);
            // y, m-1, d
            if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
            return 0;
        };
        const timeA = parseDateVal(a.cutiMulai);
        const timeB = parseDateVal(b.cutiMulai);
        return timeA - timeB;
    });

    // Theme Styles
    const getThemeStyles = (theme) => {
        switch (theme) {
            case 'gradient-blue':
                return { background: 'linear-gradient(160deg, #192670, #4c9b32)', color: 'white' };
            case 'solid-white':
                return {
                    backgroundColor: '#ffffff',
                    color: '#1e2b3b'
                };
            case 'siloam-white-dots':
                return {
                    backgroundColor: '#ffffff',
                    backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    color: '#1e2b3b'
                };
            case 'abstract-mesh':
                return {
                    background: 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)',
                    backgroundColor: '#111',
                    color: 'white'
                };
            case 'modern-geometric':
                return {
                    backgroundColor: '#f8fafc',
                    backgroundImage: 'linear-gradient(30deg, #f1f5f9 12%, transparent 12.5%, transparent 87%, #f1f5f9 87.5%, #f1f5f9), linear-gradient(150deg, #f1f5f9 12%, transparent 12.5%, transparent 87%, #f1f5f9 87.5%, #f1f5f9), linear-gradient(30deg, #f1f5f9 12%, transparent 12.5%, transparent 87%, #f1f5f9 87.5%, #f1f5f9), linear-gradient(150deg, #f1f5f9 12%, transparent 12.5%, transparent 87%, #f1f5f9 87.5%, #f1f5f9), linear-gradient(60deg, #e2e8f0 25%, transparent 25.5%, transparent 75%, #e2e8f0 75%, #e2e8f0), linear-gradient(60deg, #e2e8f0 25%, transparent 25.5%, transparent 75%, #e2e8f0 75%, #e2e8f0)',
                    backgroundSize: '40px 70px',
                    backgroundPosition: '0 0, 0 0, 20px 35px, 20px 35px, 0 0, 20px 35px',
                    color: '#1e293b'
                };
            // New Corporate Themes
            case 'corporate-blue':
                return { background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', color: 'white' };
            case 'elegant-gold':
                return { background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)', color: '#fbbf24' };
            case 'modern-clean':
                return { background: 'linear-gradient(to bottom right, #ffffff, #f3f4f6)', color: '#111827' };
            case 'professional-slate':
                return { background: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)', color: 'white' };
            case 'executive-red':
                return { background: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)', color: 'white' };
            default:
                return { background: 'linear-gradient(160deg, #192670, #4c9b32)', color: 'white' };
        }
    };

    const themeStyle = getThemeStyles(config.theme);
    const isSquare = config.format === 'square';

    // Adaptive Scaling Logic
    const count = sortedDoctors.length;
    let adaptiveScale = 1;
    if (isSquare && count > 4) adaptiveScale = Math.max(0.5, 1 - ((count - 4) * 0.10));
    if (!isSquare && count > 6) adaptiveScale = Math.max(0.5, 1 - ((count - 6) * 0.05));

    const finalScale = config.doctorFontSize * adaptiveScale;

    // Card Colors based on theme
    let cardClass;
    let dateClass;
    let nameClass = "text-white";
    let specClass = "text-white/90";

    if (config.theme === 'siloam-white-dots') {
        // Special case: White BG but Dark Blue Cards with Yellow Date
        cardClass = "bg-[#003B73] text-white shadow-lg";
        dateClass = "text-[#FBAF17]";
    } else if (config.theme === 'elegant-gold') {
        // Gold Theme - Dark BG, Gold Text
        cardClass = "bg-stone-900/50 text-[#fbbf24] border border-[#fbbf24]/30 backdrop-blur-md shadow-xl";
        dateClass = "text-[#fbbf24]";
        nameClass = "text-[#fbbf24]";
        specClass = "text-[#fbbf24]/80";
    } else if (['gradient-blue', 'abstract-mesh', 'modern-geometric', 'corporate-blue', 'professional-slate', 'executive-red'].includes(config.theme)) {
        // Dark/Transparent Themes (White Text)
        cardClass = "bg-white/20 text-white backdrop-blur-sm";
        dateClass = "text-white";
    } else {
        // Light Themes (Solid White, etc)
        cardClass = "bg-slate-50 text-slate-800 border border-slate-200 shadow-sm";
        dateClass = "text-slate-600";
        nameClass = "text-slate-800";
        specClass = "text-slate-600";
    }

    return (
        <div
            id="story-preview"
            className="flex flex-col p-16 shadow-2xl origin-top-left transition-none overflow-hidden relative"
            style={{
                width: '1080px',
                height: isSquare ? '1080px' : '1920px',
                padding: isSquare ? '48px' : '64px',
                ...themeStyle
            }}
        >
            {/* Logo */}
            <div className="flex-shrink-0 flex justify-start items-center relative z-10">
                <img
                    src={config.logoUrl || '/asset/logo/logo.png'}
                    className="h-24 object-contain"
                    alt="Logo"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            </div>

            {/* Content Container */}
            <div className={clsx("flex-grow flex flex-col justify-start items-center text-center relative z-10 w-full", isSquare ? "pt-10" : "pt-20")}>

                {/* Header */}
                <div
                    className="mb-8 w-full px-12"
                    style={{ transform: `translateY(${config.headerVerticalPos}px)` }}
                >
                    <p
                        className="font-bold tracking-widest uppercase origin-bottom"
                        style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: `${config.headerTopSize * config.headerFontSize}px`
                        }}
                    >
                        {config.headerTop}
                    </p>
                    <h2
                        className="font-extrabold uppercase origin-top"
                        style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: `${config.headerMainSize * config.headerFontSize}px`,
                            marginTop: `${config.headerSpacing}px`
                        }}
                    >
                        {config.headerMain}
                    </h2>
                </div>

                {/* Doctor List */}
                <div
                    className="w-full flex flex-col items-center justify-center flex-grow relative z-10 transition-all duration-300"
                    style={{
                        gap: `${config.spacing}px`,
                        textAlign: config.textAlign,
                        transform: `translateY(${config.verticalPos}px)`
                    }}
                >
                    {sortedDoctors.length === 0 && (
                        <div className="text-center opacity-50 text-4xl font-bold">
                            <p>SILAKAN PILIH DOKTER</p>
                        </div>
                    )}

                    {sortedDoctors.map(doc => {
                        const dateText = (doc.cutiMulai === doc.cutiSelesai)
                            ? formatFullDate(doc.cutiMulai)
                            : `${formatFullDate(doc.cutiMulai)} - ${formatFullDate(doc.cutiSelesai)}`;

                        return (
                            <div
                                key={doc.id}
                                className={clsx("flex items-center w-full rounded-2xl p-4", cardClass)}
                                style={{ transform: `scale(${adaptiveScale})` }}
                            >
                                <img
                                    src={doc.fotourl}
                                    className="w-24 h-24 rounded-full object-cover border-4 border-white flex-shrink-0"
                                    alt={doc.nama}
                                    onError={(e) => { e.target.src = 'https://placehold.co/200x200?text=No+Photo'; }}
                                />
                                <div className={clsx("ml-4 flex-grow", config.textAlign === 'center' ? 'text-center' : 'text-left')}>
                                    <h3
                                        className={clsx("font-bold leading-tight", nameClass)}
                                        style={{ fontSize: `${1.5 * finalScale}rem` }}
                                    >
                                        {doc.nama}
                                    </h3>
                                    <p
                                        className={clsx("opacity-90", specClass)}
                                        style={{ fontSize: `${1.125 * finalScale}rem` }}
                                    >
                                        {doc.spesialis}
                                    </p>
                                    <p className="mt-1">
                                        <strong
                                            className={clsx("font-semibold", dateClass)}
                                            style={{ fontSize: `${1.125 * config.dateFontSize}rem` }}
                                        >
                                            {dateText}
                                        </strong>
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Custom Message */}
                {config.customMessage && (
                    <div className="w-full text-center text-3xl font-semibold mt-8 px-12">
                        {config.customMessage}
                    </div>
                )}
            </div>

            {/* Footer */}
            {config.showFooter && (
                <div className="flex-shrink-0 flex justify-between items-center relative z-10">
                    <span className="font-bold text-xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>#BersamaSiloam</span>
                    <img src="/asset/logo/logo2.png" className="h-20 object-contain" alt="Siloam Logo" />
                </div>
            )}
        </div>
    );
};
