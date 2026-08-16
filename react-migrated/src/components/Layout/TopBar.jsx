import { Menu, Bell, User } from 'lucide-react';

export const TopBar = ({ onMobileMenuClick }) => {
    return (
        <header className="h-12 sm:h-14 lg:h-16 bg-white border-b border-[#dfe3e7] flex items-center justify-between px-3 sm:px-6 z-10 shrink-0">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMobileMenuClick}
                    className="p-1.5 sm:p-2 text-slate-500 hover:bg-slate-100 rounded-md lg:hidden"
                    aria-label="Buka Menu"
                >
                    <Menu size={22} />
                </button>
                <h1 className="text-sm sm:text-base font-bold text-slate-700 hidden sm:block">
                    Graphicat Story Generator
                </h1>
            </div>

            <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                    <div className="text-xs sm:text-sm font-bold text-slate-700 leading-tight">Executive Story</div>
                    <div className="text-[10px] text-slate-500">RSU Siloam Ambon</div>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs">
                    <User size={16} />
                </div>
            </div>
        </header>
    );
};
