package com.java5.asm.config.key;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;


@ConfigurationProperties(prefix = "rsa")
//public record RsaKeyConfigProperties(
//        org.springframework.core.io.Resource publicKey,
//        org.springframework.core.io.Resource privateKey
//) {}
public record RsaKeyConfigProperties(RSAPublicKey publicKey, RSAPrivateKey privateKey) {
}
