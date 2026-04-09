package com.java5.asm.config.key;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "imagekit")
@Getter
@Setter
public class ImageKitProperties {
    private String publicKey;
    private String privateKey;
    private String urlEndpoint;
}