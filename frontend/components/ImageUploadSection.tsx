'use client';

import { useState, useRef } from 'react';

interface ImageUploadSectionProps {
    title: string;
    description: string;
    currentImageUrl?: string | null;
    onUpload: (file: File) => Promise<void>;
    onDelete?: () => Promise<void>;
    imageType: 'icon' | 'banner';
}

export default function ImageUploadSection({
    title,
    description,
    currentImageUrl,
    onUpload,
    onDelete,
    imageType
}: ImageUploadSectionProps) {
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Invalid file type. Please upload a JPG, PNG, or WebP image.');
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            setError(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the 5MB limit.`);
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload
        setUploading(true);
        try {
            await onUpload(file);
            setPreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err: any) {
            setError(err.message || 'Failed to upload image');
            setPreview(null);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        if (!confirm(`Are you sure you want to delete the ${imageType}?`)) return;

        setDeleting(true);
        setError(null);
        try {
            await onDelete();
        } catch (err: any) {
            setError(err.message || 'Failed to delete image');
        } finally {
            setDeleting(false);
        }
    };

    const displayImage = preview || currentImageUrl;
    const aspectRatio = imageType === 'icon' ? 'aspect-square' : 'aspect-[3/1]';

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
            </div>

            {/* Image Preview */}
            {displayImage && (
                <div className={`relative w-full ${aspectRatio} bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200`}>
                    <img
                        src={displayImage}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                    {preview && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <div className="text-white text-center">
                                <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                                <p className="text-sm">Uploading...</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* No Image Placeholder */}
            {!displayImage && (
                <div className={`w-full ${aspectRatio} bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center`}>
                    <div className="text-center text-gray-400">
                        <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">No {imageType} uploaded</p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                <label className="flex-1">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileSelect}
                        disabled={uploading || deleting}
                        className="hidden"
                    />
                    <div className={`px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold text-center cursor-pointer hover:bg-blue-700 transition ${uploading || deleting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}>
                        {uploading ? 'Uploading...' : `Upload ${imageType === 'icon' ? 'Icon' : 'Banner'}`}
                    </div>
                </label>

                {currentImageUrl && onDelete && (
                    <button
                        onClick={handleDelete}
                        disabled={uploading || deleting}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition disabled:opacity-50"
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                )}
            </div>

            {/* File Requirements */}
            <p className="text-xs text-gray-500">
                Accepted formats: JPG, PNG, WebP • Max size: 5MB
                {imageType === 'icon' && ' • Recommended: Square image (e.g., 512×512px)'}
                {imageType === 'banner' && ' • Recommended: Wide image (e.g., 1200×400px)'}
            </p>
        </div>
    );
}
