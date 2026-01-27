package com.java5.asm.config;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

@RequiredArgsConstructor
public class RedisJtiValidator implements OAuth2TokenValidator<Jwt> {
    private final RedisTemplate<String, String> redisTemplate;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        String jti = jwt.getId();
        if (jti == null || jti.isBlank()) {
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Missing jti", null)
            );
        }

        Boolean exists = redisTemplate.hasKey(RedisConfig.KEY_AT_JTI + jti);
        if (!exists) {
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Access token revoked or expired", null)
            );
        }
        return OAuth2TokenValidatorResult.success();
    }
}
