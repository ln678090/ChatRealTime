package com.java5.asm.config.cloud.dto;

import lombok.Getter;
import lombok.Setter;
import org.springframework.web.bind.annotation.GetMapping;

@Getter
@Setter

public class UserProfileDto {
    private String fullName;
    private String avatarUrl;
    private String coverUrl;
    private String bio;
}