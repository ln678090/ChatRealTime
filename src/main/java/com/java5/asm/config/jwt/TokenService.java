package com.java5.asm.config.jwt;

import com.java5.asm.dto.AccessTokenResult;
import com.java5.asm.config.key.JwtProperties;
import com.java5.asm.config.custom.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TokenService {
    private final JwtEncoder jwtEncoder;
    private final JwtProperties jwtProperties;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();


    public AccessTokenResult generateAccessToken(Authentication authentication) {
        Instant now = Instant.now();
        String jti = UUID.randomUUID().toString();

        String subject; // userId
        Object principal = authentication.getPrincipal();

        subject = switch (principal) {
            case CustomUserDetails cud -> cud.getUserId().toString();
            case org.springframework.security.core.userdetails.User u -> u.getUsername(); //  set username = userId

            case String s -> s;
            case null, default -> authentication.getName(); // fallback

        };

        var roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("self")
                .issuedAt(now)
                .expiresAt(now.plus(jwtProperties.accessTokenExpiration()))
                .subject(subject)   //  sub = userId
                .id(jti)
                .claim("roles", roles)
                .build();

        String token = jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
        return new AccessTokenResult(token, jti);
    }


    // Refresh token: random mạnh, URL-safe, không padding
    public String generateRefreshToken() {
        byte[] bytes = new byte[64]; // 512-bit (đủ mạnh)
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
