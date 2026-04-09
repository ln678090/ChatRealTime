package com.java5.asm.dto.enumclass;

import lombok.Getter;

@Getter

public enum BinaryMessageType {
    // Client → Server (inbound)
    SEND_MESSAGE(1),
    MARK_DELIVERED(2),
    MARK_SEEN(3),
    TYPING(4),
    JOIN_CONVERSATION(5),
    LEAVE_CONVERSATION(6),
    // friend
    FRIEND_EVENT(7),

    // Server → Client (outbound)
    MESSAGE_RECEIVED(10),
    RECEIPT_UPDATE(11),
    TYPING_NOTIFICATION(12),
    PRESENCE_UPDATE(13),
    ERROR(99),


    CALL_OFFER(20),       // Caller gửi SDP Offer
    CALL_ANSWER(21),      // Callee trả lời SDP Answer
    ICE_CANDIDATE(22),    // Trao đổi ICE Candidate
    CALL_HANGUP(23),      // Kết thúc cuộc gọi
    CALL_REJECT(24),     // Từ chối cuộc gọi
    // AI Chat
    AI_CHAT_REQUEST(30),      // User gửi câu hỏi cho AI
    AI_CHAT_RESPONSE(31),     // AI trả lời (chunk streaming)
    AI_CHAT_COMPLETE(32),     // AI trả lời xong
    AI_CHAT_ERROR(33);        // AI lỗi

    private final int code;

    BinaryMessageType(int code) {
        this.code = code;
    }

    public static BinaryMessageType fromCode(int code) {
        for (BinaryMessageType type : values()) {
            if (type.code == code) return type;
        }
        throw new IllegalArgumentException("Unknown message type: " + code);
    }
}
