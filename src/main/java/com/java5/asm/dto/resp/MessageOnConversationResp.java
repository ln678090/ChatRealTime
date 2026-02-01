package com.java5.asm.dto.resp;

import lombok.Builder;

import java.time.OffsetDateTime;

@Builder
public record MessageOnConversationResp(
        Long id,
        String content,
        String mediaUrl,
        String messageType, // TEXT, IMAGE, FILE
        String status,      // SENT, READ
        OffsetDateTime createdAt,

        // Thông tin người gửi
        String senderId,    // UUID
        String senderName,
        String senderAvatar,

        // Cờ đánh dấu để FE dễ xử lý
        Boolean isMyMessage,
        String attachmentUrl,
        String attachmentName,
        Long attachmentSize,
        String attachmentType
) {
}
