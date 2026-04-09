package com.java5.asm.config;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class TokenStore {
    private final RedisTemplate<String, String> redisTemplate;
    private final JwtProperties jwtProperties;

    public void allowJti(String jti, String userId) {

        String jtiKey = RedisConfig.KEY_AT_JTI + jti;
        String userSetKey = "user:access:" + userId;

        redisTemplate.opsForValue().set(
                jtiKey,
                userId,
                jwtProperties.accessTokenExpiration()
        );

        redisTemplate.opsForSet().add(userSetKey, jti);

        redisTemplate.expire(userSetKey, jwtProperties.accessTokenExpiration());
    }

    public void revokeJti(String jti) {
        redisTemplate.delete(RedisConfig.KEY_AT_JTI + jti);
    }

    public boolean isJtiAllowed(String jti, String userId) {
        String val = redisTemplate.opsForValue().get(RedisConfig.KEY_AT_JTI + jti);
        return val != null && val.equals(userId);
    }

    public void revokeAllAccessTokensOfUser(String userId) {

        String key = "user:access:" + userId;

        Set<String> jtis = redisTemplate.opsForSet().members(key);

        if (jtis != null) {
            for (String jti : jtis) {
                redisTemplate.delete(RedisConfig.KEY_AT_JTI + jti);
            }
        }

        redisTemplate.delete(key);
    }

}
