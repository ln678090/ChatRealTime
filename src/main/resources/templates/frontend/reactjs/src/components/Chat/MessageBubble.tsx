// src/components/Chat/MessageBubble.tsx
import React from 'react';
import {IoDocument} from 'react-icons/io5';

interface MessageBubbleProps {
    message: any;
    isMine: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({message, isMine}) => {
    //  Check if message is file
    const isFileMessage = message.content?.startsWith('[');

    const renderContent = () => {
        if (!isFileMessage) {
            // Regular text message
            return <p className="text-sm">{message.content}</p>;
        }

        // Parse file message: [IMAGE]url|filename|size
        const match = message.content.match(/\[(\w+)\]([^|]+)\|([^|]+)\|(\d+)/);
        if (!match) {
            return <p className="text-sm">{message.content}</p>;
        }

        const [, messageType, url, filename, size] = match;
        const fileSize = (parseInt(size) / 1024).toFixed(1) + ' KB';

        //  Render based on type
        if (messageType === 'IMAGE') {
            return (
                <div className="max-w-xs">
                    <img
                        src={url}
                        alt={filename}
                        className="rounded-lg cursor-pointer hover:opacity-90"
                        onClick={() => window.open(url, '_blank')}
                    />
                    <p className="text-xs text-gray-500 mt-1">{filename} • {fileSize}</p>
                </div>
            );
        }

        if (messageType === 'VIDEO') {
            return (
                <div className="max-w-xs">
                    <video
                        src={url}
                        controls
                        className="rounded-lg max-h-64"
                    />
                    <p className="text-xs text-gray-500 mt-1">{filename} • {fileSize}</p>
                </div>
            );
        }

        // Generic file
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
                <IoDocument size={24} className="text-blue-500"/>
                <div className="flex-1">
                    <p className="text-sm font-medium">{filename}</p>
                    <p className="text-xs text-gray-500">{fileSize}</p>
                </div>
            </a>
        );
    };

    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
            <div
                className={`max-w-md px-4 py-2 rounded-2xl ${
                    isMine
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
            >
                {renderContent()}
            </div>
        </div>
    );
};

export default MessageBubble;
