package com.java5.asm.config.cloud.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class UpdateProfileDto {
    private UUID id;
    private String fullName;
    private String avatar;
    private String address; // map từ location bên ConnectHub
}