package com.java5.asm.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        Duration accessTokenExpiration,
        Duration refreshTokenExpiration
) {}