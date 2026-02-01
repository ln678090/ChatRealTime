package com.java5.asm.config;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TokenStore {
    private final RedisTemplate<String, String> redisTemplate;
    private final JwtProperties jwtProperties;

    public void allowJti(String jti, String userId) {
        redisTemplate.opsForValue().set(
                RedisConfig.KEY_AT_JTI + jti,
                userId,
                jwtProperties.accessTokenExpiration()
        );
    }

    public void revokeJti(String jti) {
        redisTemplate.delete(RedisConfig.KEY_AT_JTI + jti);
    }

    public boolean isJtiAllowed(String jti, String userId) {
        String val = redisTemplate.opsForValue().get(RedisConfig.KEY_AT_JTI + jti);
        return val != null && val.equals(userId);
    }

}
