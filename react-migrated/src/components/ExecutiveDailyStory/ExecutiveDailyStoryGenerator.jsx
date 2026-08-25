import React, { useState } from 'react';
import { ExecutiveDailyStoryProvider } from '../../context/ExecutiveDailyStoryContext';
import { ExecutiveDailyStoryControls } from './ExecutiveDailyStoryControls';
import { ExecutiveDailyStoryWorkspace } from './ExecutiveDailyStoryWorkspace';
import { X, SlidersHorizontal, Calendar, Sparkles } from 'lucide-react';

const InnerGenerator = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col h-full bg-white shadow-sm overflow-hidden">
            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile & Tablet Backdrop Overlay (< lg) */}
                <div
                    className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity duration-300 lg:hidden ${
                        isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                />

                {/* Left Controls Sidebar / Drawer (Slide-over on < lg, Static on >= lg) */}
                <div
                    className={`fixed inset-y-0 left-0 flex flex-col w-[85vw] max-w-[360px] lg:max-w-none lg:w-92 xl:w-96 bg-white border-r border-slate-200 shadow-2xl lg:shadow-none z-50 transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:h-full ${
                        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    {/* Sidebar Header */}
                    <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 bg-white shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-700 border border-blue-600/20 flex items-center justify-center">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide leading-none">
                                    Story Jadwal Executive
                                </h2>
                                <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                                    Executive Clinic Daily Schedule
                                </p>
                            </div>
                        </div>

                        {/* Mobile & Tablet Close Button (< lg) */}
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg lg:hidden transition-colors"
                            aria-label="Tutup Pengaturan"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Sidebar Controls Body with Smooth Native Scroll */}
                    <div className="flex-1 overflow-y-auto overscroll-contain">
                        <ExecutiveDailyStoryControls />
                    </div>
                </div>

                {/* Right Workspace Preview Area */}
                <main className="flex-1 relative overflow-hidden bg-slate-200 flex flex-col w-full h-full">
                    <ExecutiveDailyStoryWorkspace />

                    {/* Floating Mobile/Tablet Toggle Button (< lg) */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 lg:hidden z-30 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-full shadow-2xl flex items-center gap-2 font-extrabold text-xs sm:text-sm active:scale-95 border-2 border-white/20 transition-all"
                        title="Buka Pengaturan Desain"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Atur Jadwal & Desain</span>
                    </button>
                </main>
            </div>
        </div>
    );
};

export const ExecutiveDailyStoryGenerator = () => {
    return (
        <ExecutiveDailyStoryProvider>
            <InnerGenerator />
        </ExecutiveDailyStoryProvider>
    );
};
