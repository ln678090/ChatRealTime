package com.java5.asm.config.cloud.key;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "appbe")
public record ConnectHubUrl (
        String connecthuburl

) {}