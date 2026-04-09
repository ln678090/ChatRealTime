// src/hooks/useAiChat.ts
import {useCallback, useEffect, useRef, useState} from 'react';
import {useGlobalSocket, WsMsgType} from '../context/WebSocketContext';

export interface AiMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
    isStreaming?: boolean;
}

export const AI_CONVERSATION_ID = -1;

export function useAiChat() {
    const {sendAiMessage, subscribe, isConnected} = useGlobalSocket();

    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const streamingRef = useRef<{ id: string; content: string } | null>(null);

    // ── Lắng nghe message từ WebSocket ──────────────────────────────────────
    useEffect(() => {
        const unsub = subscribe((msg) => {
            // Chỉ xử lý AI messages — nhờ flag isAiMessage từ parseArrayPayload
            if (!msg?.isAiMessage) return;

            const {messageType, content, clientMsgId} = msg;

            // ── CHUNK: Server đang stream từng mảnh ──
            if (messageType === WsMsgType.AI_CHAT_RESPONSE) {
                const chunkContent = content ?? '';
                if (!chunkContent) return;

                setMessages(prev => {
                    // Tìm xem tin nhắn của request này đã tồn tại trong mảng chưa
                    // Dùng luôn clientMsgId để ghép ID cho tin nhắn AI
                    const aiMessageId = `ai-${clientMsgId}`;
                    const existingMsgIndex = prev.findIndex(m => m.id === aiMessageId);

                    if (existingMsgIndex >= 0) {
                        // Đã tồn tại -> Nối chuỗi (Dùng spread operator để tạo mảng mới, KHÔNG mutate ref)
                        const newMessages = [...prev];
                        newMessages[existingMsgIndex] = {
                            ...newMessages[existingMsgIndex],
                            content: newMessages[existingMsgIndex].content + chunkContent,
                            isStreaming: true
                        };
                        return newMessages;
                    } else {
                        // Chưa tồn tại -> Tạo mới (Lần đầu nhận chunk)
                        return [
                            ...prev,
                            {
                                id: aiMessageId,
                                role: 'ai',
                                content: chunkContent,
                                timestamp: Date.now(),
                                isStreaming: true,
                            },
                        ];
                    }
                });
            }

// ── COMPLETE: Stream kết thúc ──
            else if (messageType === WsMsgType.AI_CHAT_COMPLETE) {
                setIsTyping(false);
                setMessages(prev =>
                    prev.map(m =>
                        m.id === `ai-${clientMsgId}`
                            ? {...m, isStreaming: false}
                            : m
                    )
                );
            }

            // ── ERROR: AI trả về lỗi ──
            if (messageType === WsMsgType.AI_CHAT_ERROR) {
                streamingRef.current = null;
                setIsTyping(false);
                setMessages(prev => [
                    ...prev,
                    {
                        id: `err-${Date.now()}`,
                        role: 'ai',
                        content: ` Lỗi: ${content || 'Không thể kết nối AI'}`,
                        timestamp: Date.now(),
                        isStreaming: false,
                    },
                ]);
            }
        });

        // Cleanup: hủy đăng ký khi component unmount
        return unsub;
    }, [subscribe]);

    // ── Gửi tin nhắn đến AI ─────────────────────────────────────────────────
    const sendMessage = useCallback((text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isTyping) return;

        // Kiểm tra kết nối trước khi gửi
        if (!isConnected) {
            setMessages(prev => [
                ...prev,
                {
                    id: `err-${Date.now()}`,
                    role: 'ai',
                    content: '⚠️ Mất kết nối WebSocket. Vui lòng đợi kết nối lại...',
                    timestamp: Date.now(),
                    isStreaming: false,
                },
            ]);
            return;
        }

        const clientMsgId = `ai-req-${Date.now()}`;

        // Hiển thị tin nhắn user ngay lập tức (optimistic UI)
        setMessages(prev => [
            ...prev,
            {
                id: clientMsgId,
                role: 'user',
                content: trimmed,
                timestamp: Date.now(),
            },
        ]);

        setIsTyping(true);
        streamingRef.current = null;

        // Gửi qua WebSocket — context đã lo việc encode msgpack
        sendAiMessage(trimmed, clientMsgId);
    }, [isTyping, isConnected, sendAiMessage]);

    // ── Xóa toàn bộ lịch sử chat ────────────────────────────────────────────
    const clearMessages = useCallback(() => {
        setMessages([]);
        streamingRef.current = null;
        setIsTyping(false);
    }, []);

    return {messages, isTyping, sendMessage, clearMessages, isConnected};
}
