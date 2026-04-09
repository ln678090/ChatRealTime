package com.java5.asm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {

    private Long id;
    private Long conversationId;
    private UUID senderId;
    private String senderName;
    private String senderAvatar;
    private String content;
    private OffsetDateTime createdAt;

    //  messageType as String (will be "TEXT", "IMAGE", "VIDEO", "FILE")
    private String messageType;

    // File attachment fields
    private String attachmentUrl;
    private String attachmentName;
    private Long attachmentSize;
    private String attachmentType;
}
