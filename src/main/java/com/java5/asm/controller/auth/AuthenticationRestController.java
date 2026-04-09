package com.java5.asm.controller.auth;

import com.java5.asm.dto.req.GoogleLoginRequest;
import com.java5.asm.dto.req.LoginRequest;
import com.java5.asm.dto.req.RegisterReq;
import com.java5.asm.dto.resp.ApiResp;
import com.java5.asm.service.AuthenticationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RequiredArgsConstructor
@RestController
@Slf4j
@RequestMapping("/api/auth")
class AuthenticationRestController {

    final AuthenticationService authenticationService;


    @PostMapping("/login")
    public ResponseEntity<ApiResp<Object>> login(@Valid @RequestBody LoginRequest request) {
        log.info("Received login request:");
        return authenticationService.login(request);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResp<Object>> refreshToken(
            @CookieValue(name = "refreshToken", required = false) String refreshToken
    ) {
        log.info("Received refresh token request:");
//        log.info("Is Virtual on refresh token: {}", Thread.currentThread().isVirtual());
        return authenticationService.refreshToken(refreshToken);
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResp<Object>> logout(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            @RequestHeader(name = "Authorization", required = false) String authHeader
    ) {
        log.info("Received logout request:");
        return authenticationService.logout(refreshToken, authHeader);
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResp<Object>> register(
            @Valid @RequestBody RegisterReq req
    ) {
        log.info("Received register request:");
        return authenticationService.register(req);
    }

    @PostMapping("/login/google")
    public ResponseEntity<ApiResp<Object>> authenticateWithGoogle(@RequestBody GoogleLoginRequest request) {
        try {
            // Hàm service đã xây dựng sẵn ResponseEntity (chứa cookie và body ApiResp)
            // Trả về trực tiếp để giữ lại được Header Set-Cookie
            return authenticationService.loginWithGoogle(request.getIdToken());

        } catch (DisabledException ex) {
            // Trả về HTTP 403 bằng cấu trúc chuẩn ApiResp
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResp.builder()
                            .code("user_disabled")
                            .message(ex.getMessage())
                            .timestamp(String.valueOf(Instant.now()))
                            .build());

        } catch (Exception ex) {
            log.error("Lỗi đăng nhập Google: ", ex);
            // Trả về HTTP 401 bằng cấu trúc chuẩn ApiResp
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResp.builder()
                            .code("google_auth_failed")
                            .message("Xác thực Google thất bại.")
                            .timestamp(String.valueOf(Instant.now()))
                            .build());
        }
    }
    
}
