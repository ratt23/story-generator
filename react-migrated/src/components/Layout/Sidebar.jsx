import { DoctorList } from '../Doctor/DoctorList';
import { ConfigControls } from '../Controls/ConfigControls';
import { DownloadButton } from '../UI/DownloadButton';
import { X } from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-slate-600 bg-opacity-75 z-40 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Panel */}
            <div className={`fixed inset-y-0 left-0 flex flex-col w-full md:w-80 bg-white shadow-xl z-50 transform transition-transform md:translate-x-0 md:static md:h-[calc(100vh-64px)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                {/* Mobile Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 md:hidden">
                    <h2 className="text-lg font-bold text-slate-800">Menu & Pengaturan</h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-500 hover:text-slate-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto flex flex-col">
                    <div className="bg-slate-50 p-2 text-xs font-bold text-slate-500 uppercase tracking-wider px-4 sticky top-0 z-10">
                        Pilih Dokter
                    </div>
                    <div className="max-h-64 overflow-y-auto border-b border-slate-200 min-h-[200px]">
                        <DoctorList />
                    </div>

                    <div className="bg-slate-50 p-2 text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mt-2">
                        Pengaturan Tampilan
                    </div>
                    <ConfigControls />
                </div>

                {/* Sticky Download Button at Bottom */}
                <div className="p-4 border-t border-slate-200 bg-white">
                    <DownloadButton />
                </div>
            </div>
        </>
    );
};
