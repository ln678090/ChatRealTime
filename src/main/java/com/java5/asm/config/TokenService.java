package com.java5.asm.config;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtEncodingException;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class TokenService {
    private final JwtEncoder jwtEncoder;
    private final JwtProperties jwtProperties;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public String generateAccessToken(Authentication authentication) {
        Instant now = Instant.now();
        Object principal = authentication.getPrincipal();
        String uid = (principal instanceof CustomUserDetails cud)
                ? cud.getUserId().toString()
                : null;

        var roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority) // ROLE_USER...
                .toList();

        if (uid == null) {
            throw new IllegalStateException("Principal is not CustomUserDetails - cannot issue token with uid");
        }
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("self")
                .issuedAt(now)
                .expiresAt(now.plus(jwtProperties.accessTokenExpiration()))
                .subject(authentication.getName())
                .claim("uid", uid)
                .claim("roles", roles)
                .build();


        return this.jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
    public String generateRefreshToken() {
        byte[] bytes = new byte[64]; // 512-bit
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    public Instant refreshTokenExpiryInstant() {
        return Instant.now().plus(jwtProperties.refreshTokenExpiration());
    }

}