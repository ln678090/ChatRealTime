package com.java5.asm.config;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;


@RequiredArgsConstructor
public class RedisJwtDecoder implements JwtDecoder {
    private final JwtDecoder delegate;
    private final RedisTemplate<String, String> redisTemplate;


    @Override
    public Jwt decode(String token) throws JwtException {
        Jwt jwt = delegate.decode(token); //Verify JWT signature trước

        String key = RedisConfig.KEY_USER + token;
        String userId = redisTemplate.opsForValue().get(key);

        if (userId == null) {
            throw new RuntimeException("Access token revoked or expired in Redis");
        }
        return jwt;
    }
}
