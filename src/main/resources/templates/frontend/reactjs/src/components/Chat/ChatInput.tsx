// src/components/Chat/ChatInput.tsx
import React, {useState} from 'react';
import {useGlobalSocket} from '../../context/WebSocketContext';
import FileUploadButton from './FileUploadButton';
import {IoSend} from 'react-icons/io5';

interface ChatInputProps {
    conversationId: number;
}

const ChatInput: React.FC<ChatInputProps> = ({conversationId}) => {
    const {sendMessage} = useGlobalSocket();
    const [content, setContent] = useState('');

    const handleSend = () => {
        if (!content.trim()) return;

        sendMessage(conversationId, content.trim());
        setContent('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    //  Handle file upload
    const handleFileUploaded = (fileData: any) => {
        console.log('📎 File uploaded:', fileData);

        // Send file message via WebSocket
        // const fileMessage = `[FILE:${fileData.messageType}]${fileData.url}|${fileData.name}`;
        const fileMessage = `[${fileData.messageType}]${fileData.url}|${fileData.name}|${fileData.size}`;

        sendMessage(conversationId, fileMessage);
    };

    return (
        <div className="flex items-center gap-2 p-4 border-t bg-white">
            {/* File Upload Button */}
            <FileUploadButton
                conversationId={conversationId}
                onFileUploaded={handleFileUploaded}
            />

            {/* Text Input */}
            <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Send Button */}
            <button
                onClick={handleSend}
                disabled={!content.trim()}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <IoSend size={20}/>
            </button>
        </div>
    );
};

export default ChatInput;
