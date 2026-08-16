import { useState } from 'react';
import { Button } from '../UI/Button';
import { Upload, FileSpreadsheet, Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react';

export const TarifApp = () => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, uploading, success, error
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
            setErrorMsg('');
        }
    };

    const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setErrorMsg('Silakan pilih file Excel terlebih dahulu.');
            return;
        }

        setStatus('uploading');

        try {
            const fileBase64 = await toBase64(file);

            const response = await fetch('/.netlify/functions/process-tarif', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: fileBase64 }),
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.error || `Terjadi kesalahan di server (status: ${response.status})`);
            }

            setResult(data);
            setStatus('success');
        } catch (error) {
            console.error(error);
            setErrorMsg(error.message);
            setStatus('error');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="bg-white rounded-xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Upload Buku Tarif Laboratorium</h1>
                <p className="text-slate-600 mb-8">Upload file Excel untuk generate PDF buku tarif laboratorium</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${file ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
                            }`}
                    >
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                            <FileSpreadsheet className={`h-12 w-12 mb-3 ${file ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="block text-sm font-semibold text-blue-600 hover:text-blue-800">
                                {file ? file.name : 'Pilih File Excel (.xlsx)'}
                            </span>
                            <input
                                type="file"
                                name="file"
                                id="file-upload"
                                accept=".xlsx"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </label>
                        {!file && <p className="text-sm text-slate-500 mt-2">Format yang didukung: .xlsx</p>}
                    </div>

                    <Button
                        type="submit"
                        className="w-full py-3 text-base"
                        disabled={status === 'uploading' || !file}
                    >
                        {status === 'uploading' ? (
                            <>
                                <Loader2 className="animate-spin mr-2" />
                                Mengunggah & Memproses...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2" />
                                Upload & Proses File
                            </>
                        )}
                    </Button>
                </form>

                {status === 'success' && result && (
                    <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 animate-fade-in">
                        <div className="flex items-start">
                            <CheckCircle className="text-green-600 h-6 w-6 mt-0.5 mr-3" />
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-green-800 mb-2">File Berhasil Diproses!</h3>
                                <p className="text-sm text-green-700 mb-4">Total <span className="font-bold">{result.count}</span> data unik.</p>
                                <a
                                    href={result.pdf}
                                    download={`tarif-lab-${new Date().toISOString().split('T')[0]}.pdf`}
                                    className="inline-flex items-center justify-center w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Download className="mr-2" />
                                    Download PDF
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6 animate-fade-in">
                        <div className="flex items-start">
                            <AlertCircle className="text-red-600 h-6 w-6 mt-0.5 mr-3" />
                            <div>
                                <h3 className="text-lg font-semibold text-red-800 mb-1">Terjadi Kesalahan</h3>
                                <p className="text-red-600">{errorMsg}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
