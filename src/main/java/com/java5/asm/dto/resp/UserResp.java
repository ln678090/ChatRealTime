package com.java5.asm.dto.resp;

import lombok.Builder;

import java.util.UUID;

@Builder

public record UserResp(
        UUID id,
        String username,
        String email,
        String fullName,
        String avatar,
        String role
) {
}
