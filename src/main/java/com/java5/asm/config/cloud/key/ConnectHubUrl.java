package com.java5.asm.config.cloud.key;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app")
public record (
        Duration accessTokenExpiration,
        Duration refreshTokenExpiration
) {}