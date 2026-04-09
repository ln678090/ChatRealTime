// src/context/WebSocketContext.tsx
import {Packr} from "msgpackr";
import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {useAuthStore} from "../store/auth.store";
import {getBinaryChatDomain} from "../services/api/api";

export const AI_BOT_UUID = '00000000-0000-0000-0000-000000000000'; // khớp với BE

const packer = new Packr({structuredClone: false, useRecords: false});

// ─── Message Type Constants ───────────────────────────────────────────────────
export const WsMsgType = {
    // Client → Server
    SEND_MESSAGE: 1,
    MARK_DELIVERED: 2,
    MARK_SEEN: 3,
    TYPING: 4,
    JOIN_CONVERSATION: 5,
    LEAVE_CONVERSATION: 6,
    FRIEND_EVENT: 7,
    // WebRTC
    CALL_OFFER: 20,
    CALL_ANSWER: 21,
    ICE_CANDIDATE: 22,
    CALL_HANGUP: 23,
    CALL_REJECT: 24,
    // AI Chat
    AI_CHAT_REQUEST: 30,
    AI_CHAT_RESPONSE: 31, // Server → Client: streaming chunk
    AI_CHAT_COMPLETE: 32, // Server → Client: stream done
    AI_CHAT_ERROR: 33, // Server → Client: error
    // Server → Client
    MESSAGE_RECEIVED: 10,
    RECEIPT_UPDATE: 11,
    TYPING_NOTIFICATION: 12,
    PRESENCE_UPDATE: 13,
    ERROR: 99,
} as const;

export type WsMsgTypeValue = typeof WsMsgType[keyof typeof WsMsgType];

// ─── Context Type ─────────────────────────────────────────────────────────────
type WebSocketContextType = {
    isConnected: boolean;
    sendMessage: (conversationId: number, content: string, clientMsgId?: string) => void;
    sendAiMessage: (userMessage: string, clientMsgId?: string) => void; // ← MỚI
    subscribe: (callback: (msg: any) => void) => () => void;
    getSocket: () => WebSocket | null;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

// ─── Payload Parser ───────────────────────────────────────────────────────────
function parseArrayPayload(arr: any[]): any {
    if (!Array.isArray(arr) || arr.length === 0) return {};

    const messageType: number = arr[0];

    // WebRTC relay: [Type, ConvId, SenderId, DataString]
    if (messageType >= 20 && messageType <= 24) {
        return {
            messageType,
            conversationId: arr[1],
            senderId: arr[2],
            content: arr[3],
        };
    }

    // AI Chat Response (type 31, 32, 33) — Server → Client
    // Cấu trúc: [type, convId, senderId, msgId, content, clientMsgId, ts, meta, contentType, ...]
    if (messageType === WsMsgType.AI_CHAT_RESPONSE ||
        messageType === WsMsgType.AI_CHAT_COMPLETE ||
        messageType === WsMsgType.AI_CHAT_ERROR) {
        return {
            messageType,
            conversationId: arr[1] ?? -1,
            senderId: arr[2] ?? null,  // null = AI
            messageId: arr[3] ?? 0,
            content: arr[4] ?? '',
            clientMsgId: arr[5] ?? '',
            timestamp: arr[6] ?? Date.now(),
            isAiMessage: true,            // ← flag để FE dễ phân biệt
        };
    }

    // Chat thông thường + Friend Event
    if (arr.length < 8) return {};

    const payload: any = {
        messageType,
        conversationId: arr[1],
        senderId: arr[2],
        messageId: arr[3],
        content: arr[4],
        clientMsgId: arr[5],
        timestamp: arr[6],
        createdAt: new Date(Number(arr[6])).toISOString(),
        metadata: arr[7],
    };

    // Content Type (index 8)
    if (arr.length >= 9 && arr[8] !== null) payload.contentType = arr[8];

    // File Attachment (index 9–12)
    if (arr.length >= 13) {
        payload.attachmentUrl = arr[9];
        payload.attachmentType = arr[10];
        payload.attachmentName = arr[11];
        payload.attachmentSize = arr[12];
    }

    // Friend Event (index 13–16)
    if (arr.length >= 17) {
        payload.friendEventType = arr[13];
        payload.actorId = arr[14];
        payload.targetId = arr[15];
        payload.uiStatus = arr[16];
    }

    return payload;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const token = useAuthStore((s) => s.accessToken);
    const auth = useAuthStore();
    const currentUserId = useMemo(
        () => (auth as any)?.user?.id ?? (auth as any)?.id ?? (auth as any)?.userId,
        [auth]
    );

    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const subscribersRef = useRef<Set<(msg: any) => void>>(new Set());
    const isMountedRef = useRef(true);
    const closeTimeoutRef = useRef<number | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const queueRef = useRef<any[]>([]);

    // ── Flush offline queue ──
    const flushQueue = useCallback(() => {
        const ws = socketRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        while (queueRef.current.length > 0) {
            const item = queueRef.current.shift();
            if (!item) continue;
            try {
                ws.send(packer.pack(item.rawPayload));
            } catch (e) {
                console.error("[WS] flushQueue error:", e);
            }
        }
    }, []);

    // ── Connect ──
    const connect = useCallback(() => {
        if (!token) return;

        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }

        if (
            socketRef.current &&
            (socketRef.current.readyState === WebSocket.OPEN ||
                socketRef.current.readyState === WebSocket.CONNECTING)
        ) return;

        const wsUrl = `${getBinaryChatDomain()}?token=${encodeURIComponent(token)}`;
        console.log("[WS] Connecting...");

        const ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";
        socketRef.current = ws;

        ws.onopen = () => {
            console.log("[WS] Connected ");
            setIsConnected(true);
            flushQueue();
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const buffer = new Uint8Array(event.data as ArrayBuffer);
                const dataArray = packer.unpack(buffer);
                if (Array.isArray(dataArray)) {
                    const msgObject = parseArrayPayload(dataArray);
                    subscribersRef.current.forEach((cb) => cb(msgObject));
                }
            } catch (err) {
                console.error("[WS] Decode Error:", err);
            }
        };

        ws.onclose = (e) => {
            console.log(`[WS] Closed: code=${e.code}`);
            setIsConnected(false);
            socketRef.current = null;
            if (isMountedRef.current && e.code !== 1000) {
                if (!reconnectTimeoutRef.current) {
                    reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
                }
            }
        };

        ws.onerror = () => {
            console.error("[WS] Error");
            try {
                ws.close();
            } catch { /* ignore */
            }
        };
    }, [token, flushQueue]);

    useEffect(() => {
        isMountedRef.current = true;
        connect();
        return () => {
            closeTimeoutRef.current = window.setTimeout(() => {
                isMountedRef.current = false;
                if (socketRef.current) {
                    try {
                        socketRef.current.close(1000);
                    } catch { /* ignore */
                    }
                    socketRef.current = null;
                }
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
                closeTimeoutRef.current = null;
            }, 300);
        };
    }, [connect]);

    // ── Send chat message (type=1) ──
    const sendMessage = useCallback((
        conversationId: number,
        content: string,
        clientMsgId?: string
    ) => {
        const cid = clientMsgId ?? crypto.randomUUID();
        const senderId = String(currentUserId);
        const rawPayload = [
            WsMsgType.SEND_MESSAGE,
            Math.floor(conversationId),
            senderId,
            0,
            content,
            cid,
            Date.now(),
            null,
        ];
        const ws = socketRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(packer.pack(rawPayload));
        } else {
            queueRef.current.push({rawPayload});
        }
    }, [currentUserId]);

    // ── Send AI message (type=30) ──
    const sendAiMessage = useCallback((
        userMessage: string,
        clientMsgId?: string
    ) => {
        const cid = clientMsgId ?? crypto.randomUUID();
        const senderId = String(currentUserId);

        // Format: 13 fields — giống BinaryMessagePayload ở BE
        const rawPayload = [
            WsMsgType.AI_CHAT_REQUEST,  // 0: type = 30
            -1,                          // 1: conversationId = -1 (AI không lưu DB)
            senderId,                    // 2: senderId (BE override bằng JWT)
            0,                           // 3: messageId
            userMessage,                 // 4: content
            cid,                         // 5: clientMsgId
            Date.now(),                  // 6: timestamp
            null,                        // 7: metadata
            'TEXT',                      // 8: contentType
            '',                          // 9: attachmentUrl
            '',                          // 10: attachmentType
            '',                          // 11: attachmentName
            0,                           // 12: attachmentSize
        ];

        const ws = socketRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(packer.pack(rawPayload));
            console.log("[WS] AI request sent, clientMsgId:", cid);
        } else {
            // AI message không queue — nếu mất kết nối, báo lỗi UI thay vì queue
            console.warn("[WS] Cannot send AI message: WebSocket not open");
        }
    }, [currentUserId]);

    // ── Subscribe ──
    const subscribe = useCallback((callback: (msg: any) => void) => {
        subscribersRef.current.add(callback);
        return () => {
            subscribersRef.current.delete(callback);
        };
    }, []);

    const getSocket = useCallback(() => socketRef.current, []);

    const value = useMemo(() => ({
        isConnected,
        sendMessage,
        sendAiMessage,
        subscribe,
        getSocket,
    }), [isConnected, sendMessage, sendAiMessage, subscribe, getSocket]);

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useGlobalSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) throw new Error("useGlobalSocket must be used within WebSocketProvider");
    return context;
};
