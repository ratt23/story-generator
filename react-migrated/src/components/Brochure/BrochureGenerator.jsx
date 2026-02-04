import { useState } from 'react';
import { Button } from '../UI/Button';
import { InputGroup, Input } from '../Controls/InputGroup';
import { Loader2, Printer, Eye } from 'lucide-react';

export const BrochureGenerator = () => {
    const [coverUrl, setCoverUrl] = useState('asset/brochure/1.png');
    const [bgUrl, setBgUrl] = useState('asset/brochure/2.png');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ msg: 'Sistem siap. Pilih tombol di atas.', isError: false });
    const [previewHtml, setPreviewHtml] = useState(null);

    const generateBrochure = async (action) => {
        setLoading(true);
        setStatus({ msg: '🔄 Memulai proses...', isError: false });

        try {
            const isPreview = action === 'preview';
            const params = new URLSearchParams({
                preview: isPreview,
                cover: coverUrl,
                bg: bgUrl
            });
            const url = `/.netlify/functions/generate-brochure?${params.toString()}`;

            setStatus({ msg: '📡 Mengambil data...', isError: false });

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const htmlContent = await response.text();

            if (isPreview) {
                setPreviewHtml(htmlContent);
                setStatus({ msg: '✨ Preview berhasil diperbarui', isError: false });
            } else {
                // Open in new tab
                const newTab = window.open();
                newTab.document.write(htmlContent);
                newTab.document.close();
                setStatus({ msg: '🎉 Tab cetak berhasil dibuka', isError: false });
            }

        } catch (error) {
            console.error(error);
            setStatus({ msg: `❌ Error: ${error.message}`, isError: true });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-full md:w-80 bg-white p-6 shadow-lg border-r border-slate-200 overflow-y-auto z-20 flex-shrink-0">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Generator Brosur</h1>
                    <p className="text-slate-500 text-sm">Panel kontrol brosur jadwal.</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => generateBrochure('preview')}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Eye className="mr-2" />}
                            Preview Brosur
                        </Button>
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => generateBrochure('print')}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Printer className="mr-2" />}
                            Cetak Brosur
                        </Button>
                    </div>

                    <div className={`p-4 border rounded-lg text-center text-sm ${status.isError ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {status.msg}
                    </div>

                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                        <h3 className="font-semibold text-gray-800 text-sm">🎨 Tampilan Cover</h3>
                        <InputGroup label="Gambar Utama">
                            <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
                        </InputGroup>
                        <InputGroup label="Background Cover">
                            <Input value={bgUrl} onChange={(e) => setBgUrl(e.target.value)} />
                        </InputGroup>
                    </div>
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-slate-100 overflow-auto relative">
                <div className="w-fit min-w-full min-h-full flex justify-center p-8">
                    <div className="min-w-[297mm] min-h-[210mm] bg-white shadow-xl transition-all origin-top-left">
                        {previewHtml ? (
                            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        ) : (
                            <div className="flex items-center justify-center h-[210mm] text-slate-400">
                                <div className="text-center">
                                    <p className="text-lg font-medium">Preview Area</p>
                                    <p className="text-sm">Klik tombol preview</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
