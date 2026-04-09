// src/components/chat/FileAttachment.tsx
import React from 'react';
import {BsDownload, BsFileEarmarkFill, BsMusicNote, BsPlayCircle} from 'react-icons/bs';

type FileAttachmentProps = {
    messageType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
    attachmentUrl: string;
    attachmentName?: string;
    attachmentSize?: number;
    attachmentType?: string;
};

const FileAttachment: React.FC<FileAttachmentProps> = ({
                                                           messageType,
                                                           attachmentUrl,
                                                           attachmentName,
                                                           attachmentSize,
                                                       }) => {
    const type = messageType?.toUpperCase();
    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        const kb = bytes / 1024;
        return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
    };

    const handleDownload = () => {
        window.open(attachmentUrl, '_blank');
    };
    if (type === 'IMAGE') {
        return (
            <div className="mt-2 rounded-lg overflow-hidden max-w-sm cursor-pointer" onClick={handleDownload}>
                <img
                    src={attachmentUrl}
                    alt={attachmentName || 'Image'}
                    className="w-full h-auto max-h-96 object-cover"
                />
            </div>
        );
    }
    //  IMAGE: Hiển thị ảnh trực tiếp
    if (messageType === 'IMAGE') {
        return (
            <div className="mt-2 rounded-lg overflow-hidden max-w-sm cursor-pointer" onClick={handleDownload}>
                <img
                    src={attachmentUrl}
                    alt={attachmentName || 'Image'}
                    className="w-full h-auto max-h-96 object-cover hover:opacity-90 transition"
                    loading="lazy"
                />
                {attachmentName && (
                    <div className="bg-black/50 text-white text-xs px-2 py-1 flex items-center justify-between">
                        <span className="truncate flex-1">{attachmentName}</span>
                        <span className="ml-2 text-white/70">{formatSize(attachmentSize)}</span>
                    </div>
                )}
            </div>
        );
    }

    //  VIDEO: Hiển thị video player
    if (messageType === 'VIDEO') {
        return (
            <div className="mt-2 rounded-lg overflow-hidden max-w-sm">
                <video
                    src={attachmentUrl}
                    controls
                    className="w-full h-auto max-h-96 bg-black"
                    preload="metadata"
                >
                    Your browser does not support video.
                </video>
                {attachmentName && (
                    <div className="bg-gray-100 text-gray-700 text-xs px-2 py-1 flex items-center justify-between">
                        <BsPlayCircle className="mr-1"/>
                        <span className="truncate flex-1">{attachmentName}</span>
                        <span className="ml-2 text-gray-500">{formatSize(attachmentSize)}</span>
                    </div>
                )}
            </div>
        );
    }

    //  AUDIO: Hiển thị audio player
    if (messageType === 'AUDIO') {
        return (
            <div className="mt-2 rounded-lg bg-gray-100 p-3 max-w-sm">
                <div className="flex items-center gap-2 mb-2">
                    <BsMusicNote className="text-indigo-600 text-xl"/>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                            {attachmentName || 'Audio file'}
                        </div>
                        <div className="text-xs text-gray-500">{formatSize(attachmentSize)}</div>
                    </div>
                </div>
                <audio src={attachmentUrl} controls className="w-full" preload="metadata">
                    Your browser does not support audio.
                </audio>
            </div>
        );
    }

    //  FILE: Hiển thị download button
    return (
        <div
            className="mt-2 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 p-3 max-w-sm cursor-pointer hover:shadow-md transition"
            onClick={handleDownload}
        >
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                    <BsFileEarmarkFill className="text-xl"/>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                        {attachmentName || 'File'}
                    </div>
                    <div className="text-xs text-gray-500">{formatSize(attachmentSize)}</div>
                </div>
                <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-white hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition"
                    title="Tải về"
                >
                    <BsDownload/>
                </button>
            </div>
        </div>
    );
};

export default FileAttachment;
