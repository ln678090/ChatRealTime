package com.java5.asm.config;

import org.springframework.boot.context.properties.ConfigurationProperties;


@ConfigurationProperties(prefix = "rsa")
public record RsaKeyConfigProperties(
        org.springframework.core.io.Resource publicKey,
        org.springframework.core.io.Resource privateKey
) {}
