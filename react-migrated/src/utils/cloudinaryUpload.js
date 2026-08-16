/**
 * Upload logo or image to Cloudinary
 */
export async function uploadLogoToCloudinary(file) {
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'de5k1duyb';
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'admin_upload';

    if (!file || !file.type.startsWith('image/')) {
        throw new Error('File harus berupa gambar (PNG, JPG, SVG, WebP)');
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
        throw new Error('Ukuran file maksimal 5MB');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('cloud_name', CLOUD_NAME);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
            method: 'POST',
            body: formData
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Gagal mengupload logo ke Cloudinary');
    }

    const data = await response.json();

    return {
        secure_url: data.secure_url,
        public_id: data.public_id
    };
}
