package com.java5.asm.service;

import com.java5.asm.config.CustomUserDetails;
import com.java5.asm.config.JwtProperties;
import com.java5.asm.config.TokenService;
import com.java5.asm.dto.req.LoginRequest;
import com.java5.asm.dto.resp.ApiResp;
import com.java5.asm.dto.resp.AuthResponse;
import com.java5.asm.entity.RefreshToken;
import com.java5.asm.repository.RefreshTokenRepository;
import com.java5.asm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthenticationService {


    private final AuthenticationManager authenticationManager;
    private final TokenService tokenService;
    private final JwtProperties jwtProperties;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional
    public ResponseEntity<ApiResp<Object>> login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );
        String accessToken = tokenService.generateAccessToken(authentication);
        String refreshToken = tokenService.generateRefreshToken();

        String username = ((CustomUserDetails) authentication.getPrincipal()).getUsername();

        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        refreshTokenRepository.deleteByUser(user);

        RefreshToken rt = new RefreshToken();
        rt.setToken(refreshToken);
        rt.setUser(user);
        rt.setExpiryDate(Instant.now().plusSeconds(jwtProperties.refreshTokenExpiration().getSeconds()));
        rt.setRevoked(false);
        rt.setCreatedAt(Instant.now());

        refreshTokenRepository.save(rt);

        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(false) // bật nếu dùng HTTPS
                .path("/")
                .maxAge(jwtProperties.refreshTokenExpiration())
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResp.builder()
                        .code("success")
                        .data(new AuthResponse(accessToken))
                        .message("Login success")
                        .build())
                ;
    }

    @Transactional
    public ResponseEntity<ApiResp<Object>> refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResp.builder()
                            .code("invalid_refresh_token")
                            .message("Refresh Token is missing in Cookie")
                            .build());
        }

        RefreshToken rt = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new RuntimeException("RefreshToken not found"));
        if (rt.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(rt);// xóa token hết hạn

            throw new RuntimeException("Refresh token was expired. Please make a new signin request");
        }

        if (rt.getRevoked()) {
            throw new RuntimeException("Refresh token was revoked");
        }

        var user = rt.getUser();

        CustomUserDetails userDetails = new CustomUserDetails(user);

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );

        String newAccessToken = tokenService.generateAccessToken(authentication);
//        refreshTokenRepository.delete(rt); // Xóa cũ
//
//        String newRefreshToken = tokenService.generateRefreshToken(); // Tạo mới
//        RefreshToken newRt = new RefreshToken();
//        newRt.setToken(newRefreshToken);
//        newRt.setUser(user);
//        newRt.setExpiryDate(Instant.now().plusSeconds(jwtProperties.refreshTokenExpiration().getSeconds()));
//        newRt.setRevoked(false);
//        newRt.setCreatedAt(Instant.now());
//        refreshTokenRepository.save(newRt);
//        ResponseCookie cookie = ResponseCookie.from("refreshToken", newRefreshToken)
//                .httpOnly(true)
//                .secure(false) // nhớ bật true nếu chạy HTTPS production
//                .path("/")
//                .maxAge(jwtProperties.refreshTokenExpiration())
//                .sameSite("Lax")
//                .build();


        return ResponseEntity.ok
                ().body(ApiResp.builder()
                .code("success")
                .message("Refresh token success")
                .data(new AuthResponse(newAccessToken))
                .timestamp(String.valueOf(Instant.now()))
                .build())
                ;
    }

}