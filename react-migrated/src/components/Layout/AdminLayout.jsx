import { useState } from 'react';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';

export const AdminLayout = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
            {/* Left Sidebar (Desktop) */}
            <SideNav />

            {/* Mobile Sidebar (Off-canvas) */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div
                        className="fixed inset-0 bg-slate-600 bg-opacity-75 transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                    ></div>
                    <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white shadow-xl z-50 animate-slide-in">
                        <SideNav />
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopBar onMobileMenuClick={() => setIsMobileMenuOpen(true)} />

                <main className="flex-1 overflow-y-auto relative bg-[#f0f2f5]">
                    {children}
                </main>
            </div>
        </div>
    );
};
