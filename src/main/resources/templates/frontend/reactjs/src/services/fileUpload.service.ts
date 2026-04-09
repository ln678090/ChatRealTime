// src/services/fileUpload.service.ts
import axiosClient from "./api/axiosClient";
import {imagekitConfig} from "../config/imagekit.config";

export interface FileUploadAuth {
    token: string;
    signature: string;
    expire: number;
    folder: string;
}

export interface UploadedFile {
    fileId: string;
    url: string;
    thumbnailUrl?: string;
    name: string;
    size: number;
    fileType: string;
}

export const fileUploadService = {
    // Get upload authentication
    async getUploadAuth(folder: string = "/chat-files"): Promise<FileUploadAuth> {
        const res = await axiosClient.get(`/files/upload-auth?folder=${folder}`);
        return res.data;
    },

    // Upload to ImageKit
    async uploadToImageKit(
        file: File,
        auth: FileUploadAuth,
        // onProgress?: (progress: number) => void
    ): Promise<UploadedFile> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('publicKey', imagekitConfig.publicKey); // Public key
        formData.append('signature', auth.signature);
        formData.append('expire', auth.expire.toString());
        formData.append('token', auth.token);
        formData.append('fileName', file.name);
        formData.append('folder', auth.folder); // Auth folder

        //  Correct Upload Endpoint (Fixed)
        const uploadUrl = "https://upload.imagekit.io/api/v1/files/upload";

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }

        const result = await response.json();

        return {
            fileId: result.fileId,
            url: result.url,
            thumbnailUrl: result.thumbnailUrl,
            name: result.name,
            size: result.size,
            fileType: result.fileType,
        };
    },

    // Detect message type from MIME type
    detectMessageType(mimeType: string): 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' {
        if (mimeType.startsWith('image/')) return 'IMAGE';
        if (mimeType.startsWith('video/')) return 'VIDEO';
        return 'FILE';
    },

    // Format file size
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    // Validate file
    validateFile(file: File): { valid: boolean; error?: string } {
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB

        if (file.size > MAX_SIZE) {
            return {
                valid: false,
                error: 'Kích thước file tối đa 5MB'
            };
        }

        return {valid: true};
    }

};
