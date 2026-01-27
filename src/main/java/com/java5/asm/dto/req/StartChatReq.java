package com.java5.asm.dto.req;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record StartChatReq(
        @NotNull UUID receiverId
) {
}