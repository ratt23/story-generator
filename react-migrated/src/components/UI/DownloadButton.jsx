import { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { Button } from '../UI/Button';
import { Download, Loader2 } from 'lucide-react';
import { SuccessModal } from './SuccessModal';

export const DownloadButton = () => {
    const { config, selectedDoctorIds } = useStory();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleDownload = async () => {
        if (selectedDoctorIds.length === 0) {
            alert('Pilih minimal satu dokter terlebih dahulu!');
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('doctors', selectedDoctorIds.join(','));
            params.append('theme', config.theme);
            params.append('format', config.format);
            params.append('customMessage', config.customMessage);
            params.append('headerTop', config.headerTop);
            params.append('headerMain', config.headerMain);
            // Include fonts sizes and layout from config...
            params.append('headerFontSize', config.headerFontSize);
            params.append('headerTopSize', config.headerTopSize);
            params.append('headerMainSize', config.headerMainSize);
            params.append('dateFontSize', config.dateFontSize);
            params.append('textAlign', config.textAlign);
            params.append('verticalPos', config.verticalPos);
            params.append('spacing', config.spacing);
            params.append('showFooter', config.showFooter);
            params.append('logo', config.logoUrl || 'asset/logo/logo.png'); // Pass default

            params.append('t', new Date().getTime());

            // Note: Update URL if needed based on previous useFetchDoctors
            const generateUrl = `/.netlify/functions/generate-story?${params.toString()}`;

            const response = await fetch(generateUrl);
            if (!response.ok) throw new Error('Generation failed');

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);

            // Show Success Modal instead of auto-download
            setResult({ blob, url: downloadUrl });

        } catch (error) {
            console.error('Download error:', error);
            alert('Gagal membuat gambar. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                className="w-full justify-center py-3 text-lg shadow-md"
                onClick={handleDownload}
                disabled={loading || selectedDoctorIds.length === 0}
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                        Sedang Membuat...
                    </>
                ) : (
                    <>
                        <Download className="-ml-1 mr-3 h-5 w-5" />
                        Generate & Download ({selectedDoctorIds.length})
                    </>
                )}
            </Button>

            <SuccessModal
                isOpen={!!result}
                onClose={() => setResult(null)}
                imageUrl={result?.url}
                imageBlob={result?.blob}
            />
        </>
    );
};
