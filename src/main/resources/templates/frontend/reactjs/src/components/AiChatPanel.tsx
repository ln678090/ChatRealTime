// src/components/AiChatPanel.tsx
import {useEffect, useRef, useState} from 'react';
import {useAiChat} from '../hooks/useAiChat';

export function AiChatPanel() {
    const {messages, isTyping, sendMessage, clearMessages} = useAiChat();
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll khi có tin nhắn mới
    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!input.trim()) return;
        sendMessage(input.trim());
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-500 to-purple-600">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl">
                        🤖
                    </div>
                    <div>
                        <p className="font-semibold text-white">AI Assistant</p>
                        <p className="text-xs text-blue-100">
                            {isTyping ? 'Đang trả lời...' : 'Powered by lâm'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={clearMessages}
                    className="text-white/70 hover:text-white text-sm"
                    title="Xóa lịch sử"
                >
                    🗑️ Xóa
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">
                        <p className="text-4xl mb-3">🤖</p>
                        <p className="font-medium">Xin chào! Tôi có thể giúp gì cho bạn?</p>
                        <p className="text-sm mt-1">Hãy hỏi bất cứ điều gì...</p>
                    </div>
                )}

                {messages.map(msg => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'ai' && (
                            <div
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                                🤖
                            </div>
                        )}
                        <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                            }`}
                        >
                            {msg.content}
                            {/* Hiệu ứng cursor khi đang stream */}
                            {msg.isStreaming && (
                                <span className="inline-block w-0.5 h-4 bg-gray-500 ml-0.5 animate-pulse"/>
                            )}
                        </div>
                    </div>
                ))}

                {/* Typing indicator — AI đang chuẩn bị trả lời */}
                {isTyping && !messages.some(m => m.isStreaming) && (
                    <div className="flex gap-3 justify-start">
                        <div
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm">
                            🤖
                        </div>
                        <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                            <div className="flex gap-1 items-center">
                                <span
                                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]"/>
                                <span
                                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"/>
                                <span
                                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"/>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef}/>
            </div>

            {/* Input */}
            <div className="border-t p-3 flex gap-2 items-end">
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhắn tin với AI... (Enter để gửi)"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 max-h-32 overflow-y-auto"
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white transition-colors ${
                        !input.trim() || isTyping
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                    }`}
                >
                    <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}
