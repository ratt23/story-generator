import { useState } from 'react';
import { useFetchDoctors } from '../../hooks/useFetchDoctors';
import { formatFullDate } from '../../utils/helpers';
import { useStory } from '../../context/StoryContext';
import { Search } from 'lucide-react';

export const DoctorList = () => {
    const { doctors, loading, error } = useFetchDoctors();
    const { selectedDoctorIds, toggleDoctor } = useStory();
    const [searchQuery, setSearchQuery] = useState('');

    if (loading) return <div className="p-4 text-center text-slate-500">Memuat data dokter...</div>;
    if (error) return <div className="p-4 text-center text-red-500">Gagal memuat data.</div>;

    const filteredDoctors = doctors.filter(doc =>
        doc.nama.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Search */}
            <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Cari dokter..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredDoctors.length > 0 ? (
                    filteredDoctors.map(doc => (
                        <div key={doc.id} className="flex items-center">
                            <input
                                id={doc.id}
                                type="checkbox"
                                checked={selectedDoctorIds.includes(doc.id)}
                                onChange={() => toggleDoctor(doc.id)}
                                className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor={doc.id} className="ml-3 block text-sm font-medium text-slate-700 cursor-pointer select-none">
                                {doc.nama} (Cuti s/d {formatFullDate(doc.cutiSelesai)})
                            </label>
                            {/* Note: Original formatting was custom 'formatFullDate', can use util or localeString */}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-slate-500 text-center">Tidak ada dokter ditemukan.</p>
                )}
            </div>
        </div>
    );
};
