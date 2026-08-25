import { saveAs } from 'file-saver';

/**
 * Universal safe PNG downloader that guarantees proper .png file extension
 * across Chrome, Edge, Firefox, Safari, and Windows OS.
 *
 * @param {Blob|string} imageBlobOrDataUrl - The image blob or data URL to download
 * @param {string} filename - The target filename (e.g. 'jadwal-executive-dokter.png')
 */
export async function downloadPngFile(imageBlobOrDataUrl, filename = 'jadwal-executive.png') {
    const cleanFilename = filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`;

    try {
        let blobToSave = null;

        if (imageBlobOrDataUrl instanceof Blob) {
            blobToSave = imageBlobOrDataUrl;
        } else if (typeof imageBlobOrDataUrl === 'string') {
            if (imageBlobOrDataUrl.startsWith('data:')) {
                const byteString = atob(imageBlobOrDataUrl.split(',')[1]);
                const mimeString = imageBlobOrDataUrl.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                blobToSave = new Blob([ab], { type: mimeString || 'image/png' });
            } else {
                const res = await fetch(imageBlobOrDataUrl);
                blobToSave = await res.blob();
            }
        }

        if (!blobToSave) {
            throw new Error('Data gambar tidak valid untuk diunduh.');
        }

        saveAs(blobToSave, cleanFilename);
        return true;

    } catch (err) {
        console.warn('[downloadPngFile] saveAs fallback failed, attempting manual anchor click:', err);
        try {
            const url = imageBlobOrDataUrl instanceof Blob 
                ? URL.createObjectURL(imageBlobOrDataUrl) 
                : imageBlobOrDataUrl;

            const link = document.createElement('a');
            link.href = url;
            link.download = cleanFilename;
            link.setAttribute('download', cleanFilename);
            link.target = '_self';
            document.body.appendChild(link);

            const evt = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            link.dispatchEvent(evt);

            document.body.removeChild(link);
            if (imageBlobOrDataUrl instanceof Blob) {
                setTimeout(() => URL.revokeObjectURL(url), 20000);
            }
            return true;
        } catch (fallbackErr) {
            console.error('[downloadPngFile] Download failed completely:', fallbackErr);
            throw fallbackErr;
        }
    }
}

/**
 * Universal safe MP4/video downloader that guarantees proper .mp4 file extension
 * across Chrome, Edge, Firefox, Safari, and Windows OS.
 *
 * @param {Blob|string} videoBlobOrUrl - The video blob or URL to download
 * @param {string} filename - The target filename (e.g. 'story-video-executive-senin.mp4')
 */
export async function downloadVideoFile(videoBlobOrUrl, filename = 'story-video-executive.mp4') {
    let cleanFilename = filename;
    if (!cleanFilename.toLowerCase().endsWith('.mp4') && !cleanFilename.toLowerCase().endsWith('.webm')) {
        cleanFilename = `${cleanFilename}.mp4`;
    }

    try {
        let blobToSave = null;

        if (videoBlobOrUrl instanceof Blob) {
            blobToSave = videoBlobOrUrl;
        } else if (typeof videoBlobOrUrl === 'string') {
            const res = await fetch(videoBlobOrUrl);
            blobToSave = await res.blob();
        }

        if (!blobToSave) {
            throw new Error('Data video tidak valid untuk diunduh.');
        }

        // Use file-saver saveAs to guarantee proper OS file extension
        saveAs(blobToSave, cleanFilename);
        return true;

    } catch (err) {
        console.warn('[downloadVideoFile] saveAs fallback failed, attempting manual anchor click:', err);
        try {
            const url = videoBlobOrUrl instanceof Blob 
                ? URL.createObjectURL(videoBlobOrUrl) 
                : videoBlobOrUrl;

            const link = document.createElement('a');
            link.href = url;
            link.download = cleanFilename;
            link.setAttribute('download', cleanFilename);
            link.target = '_self';
            document.body.appendChild(link);

            const evt = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            link.dispatchEvent(evt);

            document.body.removeChild(link);
            if (videoBlobOrUrl instanceof Blob) {
                setTimeout(() => URL.revokeObjectURL(url), 30000);
            }
            return true;
        } catch (fallbackErr) {
            console.error('[downloadVideoFile] Video download failed completely:', fallbackErr);
            throw fallbackErr;
        }
    }
}
