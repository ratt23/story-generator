import { Menu, Bell, User } from 'lucide-react';

export const TopBar = ({ onMobileMenuClick }) => {
    return (
        <header className="h-16 bg-white border-b border-[#dfe3e7] flex items-center justify-between px-4 sm:px-6 z-10">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMobileMenuClick}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-md md:hidden"
                >
                    <Menu size={24} />
                </button>
                {/* Breadcrumb or Page Title could go here */}
                <h1 className="text-lg font-semibold text-slate-700 hidden sm:block">Dashboard</h1>
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-slate-400 hover:text-slate-600 relative">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="h-8 w-px bg-[#dfe3e7]"></div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium text-slate-700">Administrator</div>
                        <div className="text-xs text-slate-500">Super User</div>
                    </div>
                    <div className="h-9 w-9 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
                        <User size={20} />
                    </div>
                </div>
            </div>
        </header>
    );
};
