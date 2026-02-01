package com.java5.asm.dto.req;

import com.java5.asm.dto.enumclass.MessageContentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;


@Getter
@Setter

public final class SendMessageReq {
    private @NotNull(message = "Conversation ID is required") Long conversationId;
    private @NotBlank(message = "Content cannot be empty") String content;

    private MessageContentType contentType = MessageContentType.TEXT;
    private String attachmentUrl;
    private String attachmentType;
    private String attachmentName;
    private Long attachmentSize;


}
