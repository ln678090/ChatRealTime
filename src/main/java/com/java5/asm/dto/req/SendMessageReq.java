package com.java5.asm.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Builder
@Getter
@Setter
public final class SendMessageReq {
    private final @NotNull(message = "Conversation ID is required") Long conversationId;
    private final @NotBlank(message = "Content cannot be empty") String content;
    private final String messageType;

    public SendMessageReq(
            @NotNull(message = "Conversation ID is required")
            Long conversationId,
            @NotBlank(message = "Content cannot be empty")
            String content,
            String messageType
    ) {
        this.conversationId = conversationId;
        this.content = content;
        this.messageType = messageType;
    }

    public @NotNull(message = "Conversation ID is required") Long conversationId() {
        return conversationId;
    }

    public @NotBlank(message = "Content cannot be empty") String content() {
        return content;
    }

    public String messageType() {
        return messageType;
    }


}
