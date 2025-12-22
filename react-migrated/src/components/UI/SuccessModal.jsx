import { Share, Download, X, Instagram } from 'lucide-react';
import { Button } from '../UI/Button';

export const SuccessModal = ({ isOpen, onClose, imageUrl, imageBlob }) => {
    if (!isOpen) return null;

    // Helper for Web Share API
    const handleShare = async (platform) => {
        if (navigator.share && imageBlob) {
            try {
                const file = new File([imageBlob], 'story.png', { type: 'image/png' });
                await navigator.share({
                    files: [file],
                    title: 'Story Generator',
                    text: `Check out this story update! #${platform}`,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            alert('Fitur share tidak didukung di browser ini. Silakan simpan gambar manual.');
        }
    };

    const handleSave = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `story-cuti-${new Date().getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-green-500 p-4 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute right-3 top-3 text-white/80 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="mx-auto bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                        <Share className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg">Gambar Siap!</h3>
                    <p className="text-white/90 text-sm">Pilih opsi untuk melanjutkan</p>
                </div>

                {/* Preview Image */}
                <div className="p-4 bg-slate-50 flex justify-center">
                    <img
                        src={imageUrl}
                        alt="Preview"
                        className="max-h-48 rounded-lg shadow-md object-contain border border-slate-200"
                    />
                </div>

                {/* Actions */}
                <div className="p-4 space-y-3">
                    {/* Save to Photos */}
                    <Button
                        onClick={handleSave}
                        variant="primary"
                        className="w-full justify-center bg-blue-600 hover:bg-blue-700"
                    >
                        <Download className="mr-2 h-5 w-5" />
                        Simpan ke Galeri / Photos
                    </Button>

                    <p className="text-xs text-center text-slate-400 my-2">atau bagikan ke sosial media</p>

                    {/* Instagram Share */}
                    <Button
                        onClick={() => handleShare('Instagram')}
                        className="w-full justify-center bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white border-none hover:opacity-90"
                    >
                        <Instagram className="mr-2 h-5 w-5" />
                        Share Story Instagram
                    </Button>

                    {/* TikTok Share */}
                    <Button
                        onClick={() => handleShare('TikTok')}
                        className="w-full justify-center bg-black text-white hover:bg-slate-900"
                    >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 1 0 1-5.61A7.1 7.1 0 0 0 5 12.32a7.55 7.55 0 0 0 3.65 6.69 7.42 7.42 0 0 0 4.13 1.13h.36a7.25 7.25 0 0 0 7.28-7.25V6.76a4.81 4.81 0 0 0 3.3.49v.21c-.4-3.17-2.3-5.7-5.13-6.77z" />
                        </svg>
                        Share Story TikTok
                    </Button>
                </div>
            </div>
        </div>
    );
};
