package com.java5.asm.config.redis;

import org.springframework.context.annotation.Configuration;

@Configuration
public class RedisConfig {
    public static final String KEY_AT_JTI = "at:jti:"; // at:jti:<jti> -> userId
    public static final String KEY_RT = "rt:";     // rt:<sha256(refreshToken)> -> userId
    public static final String KEY_USER = "user:";   // user:<userId> -> rolesCsv (optional)
}
