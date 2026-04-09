import {getBinaryChatDomain} from "../services/api/api.ts";
import {useCallback, useEffect, useRef, useState} from 'react';
import {Packr} from 'msgpackr';
import toast from "react-hot-toast";

const packer = new Packr({
    structuredClone: false,
    useRecords: false
});

// @ts-ignore
const BinaryMessageType ={
    SEND_MESSAGE : 1,
    MARK_DELIVERED : 2,
    MARK_SEEN : 3,
    TYPING : 4,
    SYSTEM_ERROR : 33
}  as const;

export const useBinaryChatSocket = (
    conversationId: number,
    token: string,
    onMessageReceived: (msg: any) => void
) => {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    const onMessageRef = useRef(onMessageReceived);
    // const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        onMessageRef.current = onMessageReceived;
    }, [onMessageReceived]);

    const connect = useCallback(() => {
        if (!token || !conversationId) return;
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        const wsUrl = `${getBinaryChatDomain()}?token=${encodeURIComponent(token)}`;
        console.log("🔌 Connecting WS...");
        const ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
            console.log(" WS Connected");
            setIsConnected(true);
        };

        ws.onmessage = async (event) => {
            try {
                if (typeof event.data === 'string') return;

                const arrayBuffer = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
                const buffer = new Uint8Array(arrayBuffer);
                const dataArray = packer.unpack(buffer);

                if (Array.isArray(dataArray)) {
                    // Ép kiểu ép buộc về number để tránh lỗi so sánh (1 !== "1")
                    const messageType = Number(dataArray[0]);

                    console.log(` Nhận type: ${messageType}`, dataArray); // Log toàn bộ mảng để kiểm tra index

                    // === XỬ LÝ LỖI HỆ THỐNG / CẢNH BÁO TỪ CẤM ===
                    if (messageType === 33) {
                        // Theo log python của bạn, thông báo lỗi nằm ở index 4
                        const errorMessage = dataArray[4];
                        toast.error("Hệ thống: " + errorMessage, {
                            duration: 5000,
                            position: 'top-right',
                            style: {
                                background: '#333',
                                color: '#fff',
                                fontWeight: 'bold'
                            },
                        });
                        console.log(" SYSTEM_ERROR trigger:", errorMessage);
                        return; // Bắt buộc return để không đẩy vào list tin nhắn chat
                    }

                    // === XỬ LÝ TIN NHẮN CHAT BÌNH THƯỜNG ===
                    if (messageType === 1) {
                        const msgObject = {
                            messageType: messageType,
                            conversationId: dataArray[1],
                            senderId: dataArray[2],
                            messageId: dataArray[3],
                            content: dataArray[4], // Chứa ***
                            clientMsgId: dataArray[5],
                            timestamp: dataArray[6],
                            createdAt: new Date(Number(dataArray[6])).toISOString(),
                            metadata: dataArray[7]
                        };
                        console.log(" Decoded Message:", msgObject);
                        if (onMessageRef.current) onMessageRef.current(msgObject);
                    }
                }
            } catch (err) {
                console.error(" Decode error:", err);
            }
        };

        ws.onclose = (event) => {
            console.log(` WS Closed: ${event.code}`);
            setIsConnected(false);
            socketRef.current = null;
            if (event.code !== 1000) {
                reconnectTimeoutRef.current = setTimeout(connect, 3000);
            }
        };

        socketRef.current = ws;
    }, [token, conversationId]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            socketRef.current?.close(1000);
        };
    }, [connect]);

    const sendMessage = useCallback((content: string) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {

            // Mảng 12 phần tử để khớp với Backend (8 chat + 4 friend event)
            const payloadArray = [
                BinaryMessageType.SEND_MESSAGE,     // 0. Type (Int)
                Math.floor(conversationId),         // 1. ConvId (Int/Long)
                "",                                 // 2. SenderId (Server tự điền)
                0,                                  // 3. MsgId (Server tự tạo)
                content,                            // 4. Content
                crypto.randomUUID(),                // 5. ClientMsgId
                Date.now(),                         // 6. Timestamp
                null,                               // 7. Metadata

                // --- 4 FIELD CHO FRIEND EVENT (Để null/rỗng vì đây là tin nhắn chat) ---
                null,                               // 8. EventType
                null,                               // 9. ActorId
                null,                               // 10. TargetId
                null                                // 11. UiStatus
            ];

            try {
                const binaryData = packer.pack(payloadArray);
                socketRef.current.send(binaryData);
            } catch (e) {
                console.error("Pack error:", e);
            }
        }
    }, [conversationId]);

    return {isConnected, sendMessage};
};