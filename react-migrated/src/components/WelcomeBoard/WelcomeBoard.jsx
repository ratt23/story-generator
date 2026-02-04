import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

export const WelcomeBoard = () => {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const cardRef = useRef(null);

    // Fetch doctors from API
    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const response = await fetch('/.netlify/functions/getDoctors');
                if (!response.ok) throw new Error('Failed to fetch doctors');
                const data = await response.json();

                // Flatten the grouped data into a single array
                const allDoctors = [];
                Object.values(data).forEach(group => {
                    group.doctors.forEach(doctor => {
                        allDoctors.push({
                            ...doctor,
                            specialty: group.title
                        });
                    });
                });

                setDoctors(allDoctors);
                if (allDoctors.length > 0) {
                    setSelectedDoctor(allDoctors[0]);
                }
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchDoctors();
    }, []);

    const handleDownload = async () => {
        if (!cardRef.current) return;

        setDownloading(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                backgroundColor: null,
                logging: false,
                useCORS: true,
            });

            const link = document.createElement('a');
            link.download = `welcome-${selectedDoctor.name.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Download error:', err);
            alert('Failed to download image');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading doctors...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                    <h3 className="text-red-800 font-semibold mb-2">Error</h3>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Controls */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome on Board Generator</h2>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pilih Dokter
                            </label>
                            <select
                                value={selectedDoctor?.name || ''}
                                onChange={(e) => {
                                    const doctor = doctors.find(d => d.name === e.target.value);
                                    setSelectedDoctor(doctor);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {doctors.map((doctor, idx) => (
                                    <option key={idx} value={doctor.name}>
                                        {doctor.name} - {doctor.specialty}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleDownload}
                                disabled={downloading || !selectedDoctor}
                                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                                {downloading ? 'Downloading...' : 'Download Image'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Card */}
                {selectedDoctor && (
                    <div className="bg-white rounded-lg shadow-xl p-8">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Preview</h3>
                        <div
                            ref={cardRef}
                            className="relative w-full bg-cover bg-center overflow-hidden rounded-lg"
                            style={{
                                aspectRatio: '9/16',
                                maxWidth: '576px',
                                margin: '0 auto',
                                backgroundImage: 'url("/asset/Welcome on Board (2).png")',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        >
                            {/* Content Overlay */}
                            <div className="absolute inset-0 flex flex-col justify-between p-8 text-white">
                                {/* Header */}
                                <div>
                                    <h1 className="text-5xl font-bold leading-tight mb-8">
                                        Welcome<br />on Board
                                    </h1>

                                    {/* Doctor Name Badge */}
                                    <div className="bg-white/95 backdrop-blur-sm rounded-full px-6 py-4 inline-block mb-8">
                                        <h2 className="text-blue-900 font-bold text-xl">
                                            {selectedDoctor.name}
                                        </h2>
                                        <p className="text-blue-700 text-sm">
                                            Dokter {selectedDoctor.specialty}
                                        </p>
                                    </div>

                                    {/* Education Section */}
                                    <div className="mb-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="text-base font-semibold whitespace-nowrap">Pendidikan</h3>
                                            <div className="h-px bg-white/50 flex-1"></div>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p>• Fakultas Kedokteran Universitas</p>
                                            <p className="pl-4">Hang Tuah Surabaya</p>
                                            <p>• PPDS-1 Ilmu Penyakit Jantung &</p>
                                            <p className="pl-4">Pembuluh Darah Fakultas</p>
                                            <p className="pl-4">Kedokteran Universitas Airlangga</p>
                                            <p className="pl-4">Surabaya</p>
                                        </div>
                                    </div>

                                    {/* Schedule Section */}
                                    <div className="mb-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="text-base font-semibold whitespace-nowrap">Jadwal Praktik</h3>
                                            <div className="h-px bg-white/50 flex-1"></div>
                                        </div>
                                        <div className="text-sm space-y-1.5">
                                            <div>
                                                <span className="font-semibold">Senin</span>
                                                <span> : 12:00 - 14:00</span>
                                            </div>
                                            <div>
                                                <span className="font-semibold">Selasa-Kamis</span>
                                                <span> : 08:00 - 14:00</span>
                                            </div>
                                            <div>
                                                <span className="font-semibold">Jumat - Sabtu</span>
                                                <span> : 12:00 - 14:00</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Text */}
                                    <div className="text-sm leading-relaxed">
                                        <p>Manajemen dengan senang hati</p>
                                        <p>menyambut <strong>{selectedDoctor.name}</strong>,</p>
                                        <p>yang akan mulai praktik</p>
                                        <p>di <strong>RSU Siloam Ambon</strong></p>
                                    </div>
                                </div>

                                {/* Doctor Photo - Positioned on the right */}
                                <div className="absolute right-8 top-1/2 -translate-y-1/2 w-64 h-auto">
                                    <img
                                        src={selectedDoctor.image_url}
                                        alt={selectedDoctor.name}
                                        className="w-full h-auto object-contain"
                                        crossOrigin="anonymous"
                                    />
                                </div>

                                {/* Hospital Logo */}
                                <div className="mt-auto">
                                    <h2 className="text-4xl font-bold">
                                        RSU <strong>Siloam</strong>
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
