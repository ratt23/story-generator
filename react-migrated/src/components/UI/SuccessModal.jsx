import { Share, Download, X, Instagram, Video as VideoIcon } from 'lucide-react';
import { Button } from '../UI/Button';
import { downloadPngFile } from '../../utils/downloadHelper';

export const SuccessModal = ({
    isOpen,
    onClose,
    imageUrl,
    imageBlob,
    videoUrl,
    videoBlob,
    filename = 'jadwal-dokter-executive.png'
}) => {
    if (!isOpen) return null;

    const isVideo = Boolean(videoUrl || (filename && (filename.endsWith('.mp4') || filename.endsWith('.webm'))));
    const mediaUrl = videoUrl || imageUrl;
    const mediaBlob = videoBlob || imageBlob;

    // Helper for Web Share API
    const handleShare = async (platform) => {
        if (navigator.share && mediaBlob) {
            try {
                const mime = isVideo ? 'video/mp4' : 'image/png';
                const file = new File([mediaBlob], filename, { type: mime });
                await navigator.share({
                    files: [file],
                    title: 'Story Jadwal Dokter Executive Clinic',
                    text: `Jadwal Praktik Dokter Executive Clinic RSU Siloam Ambon #${platform}`,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            alert('Fitur share tidak didukung di browser ini. Silakan unduh file secara manual.');
        }
    };

    const handleSave = async () => {
        if (!mediaUrl && !mediaBlob) return;
        try {
            if (isVideo) {
                const a = document.createElement('a');
                a.href = mediaUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                await downloadPngFile(mediaBlob || mediaUrl, filename);
            }
        } catch (err) {
            console.error('Download ulang error:', err);
        }
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
                <div className={`p-4 text-center relative ${isVideo ? 'bg-gradient-to-r from-blue-700 to-indigo-800' : 'bg-emerald-600'}`}>
                    <button
                        onClick={onClose}
                        className="absolute right-3 top-3 text-white/80 hover:text-white p-1 rounded-lg"
                        aria-label="Tutup"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="mx-auto bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-inner">
                        {isVideo ? (
                            <VideoIcon className="w-6 h-6 text-amber-300" />
                        ) : (
                            <Download className="w-6 h-6 text-white" />
                        )}
                    </div>
                    <h3 className="text-white font-bold text-lg">
                        {isVideo ? 'Video MP4 Berhasil Dibuat!' : 'File PNG Siap Diunduh!'}
                    </h3>
                    <p className="text-blue-100 text-xs mt-0.5 font-mono truncate px-4">{filename}</p>
                </div>

                {/* Media Preview Box */}
                <div className="p-4 bg-slate-950 flex justify-center max-h-64 overflow-hidden items-center">
                    {isVideo ? (
                        <video
                            src={mediaUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            controls
                            className="max-h-56 rounded-lg shadow-md object-contain border border-slate-700"
                        />
                    ) : (
                        <img
                            src={imageUrl}
                            alt="Preview Story"
                            className="max-h-52 rounded-lg shadow-md object-contain border border-slate-300"
                        />
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 space-y-2.5">
                    {/* Save / Download again */}
                    <Button
                        onClick={handleSave}
                        variant="primary"
                        className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-sm"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download Ulang ({filename})
                    </Button>

                    <p className="text-[11px] text-center text-slate-400 my-1 font-medium">atau bagikan langsung</p>

                    {/* Instagram Share */}
                    <Button
                        onClick={() => handleShare('Instagram')}
                        className="w-full justify-center bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white border-none hover:opacity-95 font-bold py-2.5 rounded-xl shadow-xs"
                    >
                        <Instagram className="mr-2 h-4 w-4" />
                        Share ke Instagram Story
                    </Button>
                </div>
            </div>
        </div>
    );
};
