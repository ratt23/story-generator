import { NavLink, useLocation } from 'react-router-dom';
import { Home, FileText, Sparkles, LayoutDashboard, Settings, BookOpen } from 'lucide-react';
import clsx from 'clsx';

const APP_VERSION = 'v3.0.0';
const APP_DATE = '17 Agu 2026';

export const SideNav = ({ className = '' }) => {
    const location = useLocation();
    const navItems = [
        { name: 'Executive Doctor Card', path: '/executive-card', icon: <Sparkles size={20} className="text-amber-500" /> },
        { name: 'Executive Brochure', path: '/executive-brochure', icon: <FileText size={20} className="text-amber-500" />, isNew: true },
        { name: 'Story Cuti Dokter', path: '/', icon: <Home size={20} /> },
        { name: 'Brochure Generator', path: '/brochure', icon: <FileText size={20} /> },
        { name: 'Welcome Board', path: '/welcome', icon: <LayoutDashboard size={20} /> },
    ];

    return (
        <aside className={`w-64 bg-white border-r border-[#dfe3e7] flex-shrink-0 flex flex-col h-full z-20 ${className}`}>
            <div className="h-16 flex items-center px-6 border-b border-[#dfe3e7]">
                <div className="flex items-center gap-2 text-[#1e3a8a] font-bold text-xl">
                    <div className="w-8 h-8 bg-[#1e3a8a] text-white rounded flex items-center justify-center font-bold">A</div>
                    <span>Admin</span>
                </div>
            </div>

            <div className="py-4 flex-1 overflow-y-auto">
                <div className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Main Menu
                </div>
                <nav className="space-y-1 px-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors",
                                isActive
                                    ? "bg-[#eef2ff] text-[#1e3a8a] border-l-4 border-[#1e3a8a]"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            {/* Icon wrapper to ensure alignment */}
                            <span className={clsx(item.path === location.pathname ? "text-[#1e3a8a]" : "text-slate-400 group-hover:text-slate-500")}>
                                {item.icon}
                            </span>
                            <span className="flex-1">{item.name}</span>
                            {item.isNew && (
                                <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-xs">
                                    NEW
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Docs Section */}
                <div className="px-4 mt-5 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Dokumentasi
                </div>
                <nav className="space-y-1 px-2">
                    <NavLink
                        to="/changelog"
                        className={({ isActive }) => clsx(
                            "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors",
                            isActive
                                ? "bg-[#1e2a4a] text-[#818cf8] border-l-4 border-[#6366f1]"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                        title="Lihat riwayat semua perubahan aplikasi"
                    >
                        <span className="text-slate-400">
                            <BookOpen size={20} />
                        </span>
                        <span className="flex-1">Changelog</span>
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {APP_VERSION}
                        </span>
                    </NavLink>
                </nav>
            </div>

            <div className="p-4 border-t border-[#dfe3e7]">
                {/* Version badge */}
                <div className="px-4 py-2 mb-1 bg-slate-50 rounded-md border border-slate-200">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Versi Aplikasi</span>
                        <span className="text-[10px] font-black text-[#1e3a8a]">{APP_VERSION}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Update: {APP_DATE}</div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md cursor-pointer">
                    <Settings size={20} className="text-slate-400" />
                    <span>Settings</span>
                </div>
            </div>
        </aside>
    );
};
