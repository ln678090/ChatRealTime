package com.java5.asm.config.cloud.dto;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class SyncUserDto {
    private UUID id;
    private String username;
    private String fullName;
    private String email;
    private String avatar;
}