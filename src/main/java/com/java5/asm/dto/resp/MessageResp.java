package com.java5.asm.dto.resp;

import com.java5.asm.dto.enumclass.MessageContentType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResp {
    private long id;
    private long conversationId;
    private UUID senderId;
    private String senderName;
    private String senderAvatar;
    private String content;

    // File attachment
    private MessageContentType messageType;
    private String attachmentUrl;
    private String attachmentType;
    private String attachmentName;
    private Long attachmentSize;

    private LocalDateTime createdAt;
    private Boolean isDeleted;
}