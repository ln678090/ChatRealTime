package com.java5.asm.dto.resp;

import lombok.Builder;

import java.util.UUID;

@Builder
public record UserFindUserResp(
        UUID id,
        String fullName,
        String username,
        String avatar,
        boolean isOnline
) {
}