package com.java5.asm.dto.req;


import jakarta.validation.constraints.NotBlank;

public record FriendAcceptReq(@NotBlank String requesterId) {
}