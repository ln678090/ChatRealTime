import React, {useRef, useState} from 'react';
import {BsPaperclip} from 'react-icons/bs';
import {fileUploadService} from '../../services/fileUpload.service';
import toast from "react-hot-toast";

interface FileUploadButtonProps {
    conversationId: number;
    onFileUploaded: (fileData: any) => void;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({conversationId, onFileUploaded}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Validate
        const validation = fileUploadService.validateFile(file);
        if (!validation.valid) {
            toast.error(validation.error ?? "File không hợp lệ", {
                duration: 5000,
                position: 'top-right',
                style: {
                    background: '#333',
                    color: '#fff',
                    fontWeight: 'bold'
                }
            });
            return;
        }

        try {
            setIsUploading(true);

            // 2. Get Auth
            // Thêm timestamp để tránh cache
            const folder = `chat-files/${conversationId}`;
            const auth = await fileUploadService.getUploadAuth(folder);

            // 3. Upload
            const uploaded = await fileUploadService.uploadToImageKit(file, auth);

            console.log(' Uploaded:', uploaded);

            // 4. Map data for ChatWindow
            const messageType = fileUploadService.detectMessageType(file.type); // "IMAGE"

            onFileUploaded({
                url: uploaded.url,
                name: uploaded.name,
                size: uploaded.size,
                type: uploaded.fileType, // "image"
                messageType: messageType, // "IMAGE"
            });

        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error('Upload thất bại: ' + error.message);
        } finally {
            setIsUploading(false);
            if (inputRef.current) inputRef.current.value = ''; // Reset input
        }
    };

    return (
        <>
            <input
                type="file"
                ref={inputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,application/pdf" // Optional filter
            />

            <button
                type="button"
                onClick={() => !isUploading && inputRef.current?.click()}
                disabled={isUploading}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                    isUploading ? 'bg-gray-100 cursor-wait' : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Đính kèm file"
            >
                {isUploading ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></div>
                ) : (
                    <BsPaperclip className="text-lg"/>
                )}
            </button>
        </>
    );
};

export default FileUploadButton;
